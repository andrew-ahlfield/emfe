# Toolchain — why Node and npm are pinned

The short version: on a laptop run `nvm use` (picks the pinned Node 24.18.0), and use
`npm run verify` to run exactly what CI runs. The one hard rule: **never run `npm install` with npm
11.5.0–11.6.2** — those versions silently corrupt the lockfile. If npm refuses to install with
`EBADENGINE`, that's this rule firing; jump to [Fixing EBADENGINE](#fixing-ebadengine).

This is about npm, not Node: any npm outside that window is fine, which is why a Claude Code cloud
session (Node 22 / npm 10.9.7) is fully supported.

## The bug this exists to prevent

npm **11.5.0 – 11.6.2** prune optional peer dependencies out of `package-lock.json`
([npm/cli#8431](https://github.com/npm/cli/pull/8431), reverted in 11.6.3 by
[npm/cli#8645](https://github.com/npm/cli/pull/8645); fallout in
[#8464](https://github.com/npm/cli/issues/8464), [#8669](https://github.com/npm/cli/issues/8669)).

This repo is exposed because `@napi-rs/wasm-runtime` is an _optional_ package whose _peer_
dependencies are `@emnapi/core` and `@emnapi/runtime`. Run `npm install` on a bad npm and those
entries silently vanish from the lockfile. `npm ci` on a good npm then refuses to install:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json are in sync.
npm error Missing: @emnapi/core@1.11.2 from lock file
```

**Why it went unnoticed for weeks:** the failure is asymmetric and invisible locally.

| lockfile written by | `npm ci` on 11.6.2 | `npm ci` on 11.16.0 |
| ------------------- | ------------------ | ------------------- |
| npm 11.6.2 (pruned) | passes             | **fails**           |
| npm 11.16.0 (full)  | passes             | passes              |

So a developer on 11.6.2 sees green locally while CI dies. The newer lockfile is a superset that
works everywhere — **the fix is always to regenerate with a good npm, never to "simplify" the
lockfile to make an old npm happy.**

## Node → npm

npm ships bundled with Node, so the Node version _is_ the npm version
([nodejs.org/dist/index.json](https://nodejs.org/dist/index.json) is authoritative):

| Node         | npm     |                                  |
| ------------ | ------- | -------------------------------- |
| v24.11.1     | 11.6.2  | prunes the lockfile — do not use |
| **v24.13.0** | 11.6.2  | prunes the lockfile — do not use |
| **v24.13.1** | 11.8.0  | first good release               |
| v24.18.0     | 11.16.0 | pinned in [`.nvmrc`](../.nvmrc)  |

Note the one-patch cliff between 24.13.0 and 24.13.1. "I'm on Node 24" is not good enough.

## What enforces this

Three independent layers, so no single mistake re-breaks CI:

1. **[`.nvmrc`](../.nvmrc) pins `24.18.0`** — `nvm use` locally; CI reads the same file via
   `setup-node`'s `node-version-file`. CI previously said `node-version: 24`, a floating major that
   followed Node's bundled npm wherever it went. That float is what silently invalidated the lock.
2. **`engines.npm: "<11.5.0 || >=11.6.3"` in `package.json`**, made fatal by `engine-strict=true`
   in [`.npmrc`](../.npmrc). npm's docs call `engines` advisory, but with `engine-strict` it is a
   hard exit-1 on the root project.

   The range blocks **the broken window and nothing else** — it is not "new enough npm". npm 10.x
   predates the bug and is fine; only 11.5.0–11.6.2 corrupt:

   | npm             | verdict |
   | --------------- | ------- |
   | 10.9.7          | allowed |
   | 11.4.2          | allowed |
   | 11.5.0 – 11.6.2 | blocked |
   | 11.6.3 +        | allowed |

   The scope is right too: it blocks `npm install` / `npm ci` — the commands that rewrite the
   lockfile — while `npm run <script>` still works, so a bad npm never blocks the dev loop, only
   the operation that would corrupt something.

3. **A CI lockfile-sync check** that fails with a readable message instead of npm's EUSAGE wall.

`engines.node` is deliberately **not** pinned. npm is what matters, and it moves independently of
Node — a Claude Code cloud session runs Node 22 / npm 10.9.7 and is perfectly safe, so a Node floor
would lock that environment out for no benefit.

## Fixing EBADENGINE

```
npm error notsup Required: {"npm":"<11.5.0 || >=11.6.3"}
npm error notsup Actual:   {"npm":"11.6.2","node":"v24.13.0"}
```

Your npm is inside the broken window and corrupts lockfiles. Either bump Node (preferred —
`nvm install` reads `.nvmrc`):

```bash
nvm install && nvm use     # → Node 24.18.0 / npm 11.16.0
```

or upgrade npm in place, which works anywhere Node can't easily change (some containers):

```bash
npm i -g npm@11.16.0
```

## Running the checks — local and Claude Code cloud

```bash
npm run verify   # lint → check → data:validate → test → build → e2e (exactly what CI runs)
```

This works identically on a laptop and inside a Claude Code cloud session. The cloud image ships
its own Chromium under `PLAYWRIGHT_BROWSERS_PATH`, and its build rarely matches the revision
`@playwright/test` pins — so a managed launch dies with `Executable doesn't exist at …`.

**Claude Code cloud baseline** (probed 2026-07-15 — re-check rather than assume, images drift):

|                                    |                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| Node / npm                         | `v22.22.2` / `10.9.7` — outside the broken window; verified not to rewrite the lock |
| `PLAYWRIGHT_BROWSERS_PATH`         | `/opt/pw-browsers`, containing `chromium-1194` + `chromium_headless_shell-1194`     |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | **unset** (an earlier doc claimed it was `1`)                                       |
| user                               | `root`, prefix `/opt/node22` — a global npm upgrade is possible if ever needed      |

Note the cloud runs Node 22 while CI pins Node 24: `engines.node` is intentionally unset so both
are legal. If a change ever depends on Node 24 semantics, CI is the environment that proves it.

`resolveChromium()` in [`playwright.shared.ts`](../playwright.shared.ts) handles that by pointing
`executablePath` at whatever Chromium is actually installed. **All three browser suites** use it:

| suite                | config                       |
| -------------------- | ---------------------------- |
| component (`vitest`) | `vite.config.ts`             |
| e2e                  | `playwright.config.ts`       |
| live smoke           | `playwright.smoke.config.ts` |

It is env-gated — with no `PLAYWRIGHT_BROWSERS_PATH` it returns `undefined` and managed Playwright
is used unchanged, so local and CI runs are untouched. It accepts both the `chrome-linux64/` and
legacy `chrome-linux/` payload layouts, because Playwright renamed that directory and the cloud
image's build may sit on either side of the rename.

The live smoke test (`npm run test:smoke`) additionally needs the egress proxy's CA trusted by the
browser — see [`cloud-smoke-test.md`](cloud-smoke-test.md).
