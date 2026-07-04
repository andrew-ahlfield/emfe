# Running the live smoke test inside Claude Code cloud

`npm run test:smoke` drives a headless Chromium against the **deployed** app
(`https://dev--emfe.netlify.app` by default; override with `SMOKE_URL`). On a
normal laptop or CI runner it "just works": Playwright installs its own matched
browser and there's no egress proxy in the way.

Inside a sandboxed **Claude Code cloud** session two things get in the way: a
browser-build mismatch (handled in-repo) and the egress proxy's TLS
re-termination (a one-time CA-trust setup step).

**Bottom line:**

- **Unit tests + local e2e (`npm run check`, `npm run test:unit`, `npm run
  test:e2e`) run green in the cloud container today** — the only blocker was the
  browser build, now solved in `playwright.shared.ts`. Local e2e serves the app
  on `localhost:4173`, so the egress proxy never enters into it.
- **The live smoke test** (`npm run test:smoke`, which drives the browser to the
  real deployment over the internet) additionally needs the proxy CA trusted by
  the browser — a one-liner once `certutil` is present (§2). After that the cert
  layer passes; any remaining flakiness is the proxy's browser transport, not
  trust, so the robust "close the loop" run is still best done from direct
  egress, with `curl` used in-sandbox to confirm the deploy is live.

## 1. Browser build mismatch — handled in-repo ✅

Applies to **both** browser suites — `playwright.config.ts` (local e2e) and
`playwright.smoke.config.ts` (live smoke) share one resolver in
`playwright.shared.ts`.

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
does that automatically: it scans `PLAYWRIGHT_BROWSERS_PATH` for whatever
`chromium-<rev>` is actually present and uses it. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to force a specific binary. Both are no-ops
locally (the env vars are unset), so managed Playwright is used as before.

> Version skew between the binary and the client protocol is acceptable here —
> we only need a browser that launches and loads a page. Verified: the full
> local e2e suite passes on the installed `chromium-1194` against
> `@playwright/test` 1.61.1.

## 2. Egress proxy + CA trust — one-time setup ⚠️

**Only the live smoke test hits this** (it drives the browser to the internet).
Local e2e stays on `localhost`, so skip this section unless you're running
`test:smoke` from inside the sandbox.

All outbound HTTPS is tunnelled through a policy proxy
(`HTTPS_PROXY=http://127.0.0.1:<port>`) that **re-terminates TLS**, so every
client must trust the proxy CA at `/root/.ccr/ca-bundle.crt`. `curl` does
(pre-pointed at the bundle) — `curl https://dev--emfe.netlify.app/` returns
`200`. The smoke config routes the browser through the proxy too
(`--proxy-server=$HTTPS_PROXY`, `proxy: { server }`).

Chromium verifies server certs against its **own NSS store** (`~/.pki/nssdb`),
not the `SSL_CERT_FILE` / `NODE_EXTRA_CA_CERTS` env vars the proxy pre-sets, and
`--ignore-certificate-errors` / `ignoreHTTPSErrors` do **not** reliably override
a proxy-tunnelled cert on this headless build. So without the CA in that store
the handshake is dropped (`net::ERR_CONNECTION_CLOSED`).

### The fix (works from inside the sandbox)

`certutil` isn't in the base image but **is installable** through the proxy, and
the NSS store is writable:

```bash
apt-get update && apt-get install -y libnss3-tools      # provides certutil
certutil -d sql:"$HOME/.pki/nssdb" -A -t "C,," \
  -n ccr-agent-proxy -i /root/.ccr/agent-proxy-ca.crt   # trust the proxy CA
```

After this the cert layer passes — the error moves *past* trust (from
`ERR_CONNECTION_CLOSED` to a transport-level `ERR_CONNECTION_RESET`/timeout),
confirming the CA is now accepted. What remains is the proxy's own handling of
the browser's external-HTTPS transport, which is flaky in this container in a way
`curl` (single, simple request) is not.

### Practical guidance

- **Make it automatic:** a `SessionStart` hook running the two commands above
  trusts the CA at the start of every cloud session (the browser-build fix
  already lives in the config). Ideal platform fix: ship `libnss3-tools` and
  pre-seed the proxy CA into `~/.pki/nssdb` so even this hook is unnecessary.
- **For a dependable "close the loop" smoke run**, point at the deploy from an
  environment with direct egress (a laptop, or CI outside the proxied sandbox):
  ```bash
  npm run test:smoke                                     # → dev--emfe.netlify.app
  SMOKE_URL=https://emfe.exagrow.com npm run test:smoke  # production
  ```
- **In-sandbox, at minimum** confirm the deploy with `curl` (which trusts the
  bundle): a `200`, plus a grep of the shipped JS bundle for a known string from
  your change, proves the code is actually live even when the browser can't
  drive it.
