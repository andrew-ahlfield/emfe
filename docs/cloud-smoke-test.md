# Running the live smoke test inside Claude Code cloud

`npm run test:smoke` drives a headless Chromium against the **deployed** app
(`https://dev--emfe.netlify.app` by default; override with `SMOKE_URL`). On a
normal laptop or CI runner it "just works": Playwright installs its own matched
browser and there's no egress proxy in the way.

Inside a sandboxed **Claude Code cloud** session two things get in the way. The
first is handled entirely in `playwright.smoke.config.ts`; the second needs a
platform-side fix and is the reason the smoke test can't yet go green from
within the container.

## 1. Browser build mismatch — handled in-repo ✅

The cloud image pre-installs Chromium under `PLAYWRIGHT_BROWSERS_PATH`
(`/opt/pw-browsers`) and sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so
`postinstall` can't fetch more. But the installed build (e.g. `chromium-1194`)
rarely matches the revision this `@playwright/test` version pins
(e.g. `chromium_headless_shell-1228`), so the default managed launch dies with:

```
browserType.launch: Executable doesn't exist at
/opt/pw-browsers/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell
```

Playwright has **no "any version is fine" switch** — it resolves the browser by
the exact pinned revision. The supported escape hatch is to point
`launchOptions.executablePath` at a browser you know exists. `resolveChromium()`
in the smoke config does that automatically: it scans `PLAYWRIGHT_BROWSERS_PATH`
for whatever `chromium-<rev>` is actually present and uses it. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to force a specific binary. Both are no-ops
locally (the env vars are unset), so managed Playwright is used as before.

> Version skew between the binary and the client protocol is acceptable for a
> smoke test — we only need a browser that launches and loads a page.

## 2. Egress proxy + CA trust — needs the platform ⚠️

All outbound HTTPS from a session is tunnelled through a policy proxy
(`HTTPS_PROXY=http://127.0.0.1:<port>`) that **re-terminates TLS**, so every
client must trust the proxy CA at `/root/.ccr/ca-bundle.crt`. `curl` does
(it's pre-pointed at the bundle) — `curl https://dev--emfe.netlify.app/` returns
`200`. The smoke config routes the browser through the proxy too
(`--proxy-server=$HTTPS_PROXY`, `proxy: { server }`).

What's still missing: the **Playwright-bundled Chromium does not trust the proxy
CA**, so the tunnelled TLS handshake is dropped:

```
page.goto: net::ERR_CONNECTION_CLOSED at https://dev--emfe.netlify.app/
```

Chromium verifies server certs against its own NSS store
(`~/.pki/nssdb`), not the `SSL_CERT_FILE` / `NODE_EXTRA_CA_CERTS` env vars the
proxy pre-sets, and `--ignore-certificate-errors` / `ignoreHTTPSErrors` do not
override a proxy-tunnelled cert on the new-headless build here. The container
ships **no `certutil`** (`libnss3-tools`), so the CA can't be injected into that
store from inside the session either.

### What Claude Code cloud needs to provide (any one of):

- **`certutil` (`libnss3-tools`) in the image**, so a setup step can run:
  ```
  certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n ccr-proxy -i /root/.ccr/ca-bundle.crt
  ```
  and the browser then trusts the proxy CA with no per-test flags.
- **Pre-seed the proxy CA into the browser NSS store** as part of the same
  "browser NSS store is already set up" accommodation the proxy README claims
  (it currently isn't populated with this CA for the Playwright browser).
- **A Playwright Chromium whose build matches the installed `@playwright/test`**
  (removes item 1) **and** trusts the proxy CA (removes item 2).

Until one of those lands, run the smoke test **against the deploy from a machine
with normal egress** (a laptop, or CI outside the proxied sandbox):

```
npm run test:smoke                       # → dev--emfe.netlify.app
SMOKE_URL=https://emfe.exagrow.com npm run test:smoke   # production
```

Reachability of the deploy itself is verifiable from inside the sandbox with
`curl` (which trusts the bundle): a `200` there confirms the target is live even
when the browser can't drive it.
