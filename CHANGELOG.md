## [Unreleased]

### Added

- **Interactive incident card via MCP Apps (SEP-1865).** `ironscales_incidents_get` results now render as an interactive card in MCP Apps hosts (Claude Desktop/web, and other hosts advertising the `io.modelcontextprotocol/ui` extension), instead of a wall of JSON. The card shows the phishing incident's subject, status, severity, sender, affected recipients, and threat indicators. Non-App hosts are unaffected: the tool's JSON payload is unchanged apart from a new `_card` field.
  - The renderable tool advertises the UI via `_meta` (`ui/resourceUri`, plus the nested `ui.resourceUri` form) pointing at a new `ui://ironscales/incident-card.html` resource served as `text/html;profile=mcp-app`. The card HTML is a self-contained vite single-file bundle embedded at build time (`src/generated/incident-card-html.ts`, committed), so it serves identically from stdio, Node HTTP, and the fs-less Cloudflare Workers runtime. The server now declares the `resources` capability and answers `resources/list` / `resources/read` (`src/resources.ts`).
  - The card is neutral by default (system fonts, no vendor identity, no external fetches) and brandable via `window.__BRAND__` injection or `MCP_BRAND_*` env vars (`MCP_BRAND_NAME`, `MCP_BRAND_LOGO_URL`, `MCP_BRAND_PRIMARY_COLOR`, `MCP_BRAND_ACCENT_COLOR`, `MCP_BRAND_BG`, `MCP_BRAND_TEXT`): at serve time the server replaces the card's BRAND_INJECT marker with an inline, `<`-escaped `window.__BRAND__` script, so self-hosters can theme the card without rebuilding. No brand configured = HTML served unchanged.
  - The card is read-only by design: Ironscales remediation (quarantine et al.) is a deliberate, destructive action that stays with the model-driven remediation tools rather than a one-click card button.
  - The card payload builder is best-effort: a payload that isn't card-worthy degrades to the plain JSON result without affecting the tool call. 17 new contract tests in `src/__tests__/mcp-apps.test.ts` pin the `_meta` advertisement, the `ui://` resource wire shape, the neutral-default/brand-injection behavior, and the card normalization.

### Fixed

- `GET /health` (and new `/healthz` alias) now return a shallow, unauthenticated `200 {"status":"ok"}` with no credential or upstream checks. Previously `/health` ran through `getCredentials()` and returned `503` whenever credentials were absent. In gateway mode credentials are injected per-request via headers and are never present at startup, so the ACA liveness probe received `503` every 30s and continuously killed the container (crash loop). It also produced a recurring `[WARN] Missing Ironscales credentials` log.
- CI `Test` job: added an ESLint v9 flat config (`eslint.config.js`) and the `typescript-eslint` devDependency. The repo declared a `lint` script and ESLint 9 but shipped no flat config, so the canonical reusable CI's non-skippable lint step failed (`ESLint couldn't find an eslint.config file`) on every run.

# 1.0.0 (2026-04-07)


### Bug Fixes

* **ci:** deploy :latest tag, force revision via env var bump ([c738fe6](https://github.com/wyre-technology/ironscales-mcp/commit/c738fe6bb7cbeb022a1592f0d5489b9d32ab4e01))


### Features

* initial Ironscales MCP server scaffold ([3d931a4](https://github.com/wyre-technology/ironscales-mcp/commit/3d931a4e4c09b8ca542833f3518a02075c1a269b))
