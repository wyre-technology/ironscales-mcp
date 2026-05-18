## [Unreleased]

### Fixed

- `GET /health` (and new `/healthz` alias) now return a shallow, unauthenticated `200 {"status":"ok"}` with no credential or upstream checks. Previously `/health` ran through `getCredentials()` and returned `503` whenever credentials were absent. In gateway mode credentials are injected per-request via headers and are never present at startup, so the ACA liveness probe received `503` every 30s and continuously killed the container (crash loop). It also produced a recurring `[WARN] Missing Ironscales credentials` log.
- CI `Test` job: added an ESLint v9 flat config (`eslint.config.js`) and the `typescript-eslint` devDependency. The repo declared a `lint` script and ESLint 9 but shipped no flat config, so the canonical reusable CI's non-skippable lint step failed (`ESLint couldn't find an eslint.config file`) on every run.

# 1.0.0 (2026-04-07)


### Bug Fixes

* **ci:** deploy :latest tag, force revision via env var bump ([c738fe6](https://github.com/wyre-technology/ironscales-mcp/commit/c738fe6bb7cbeb022a1592f0d5489b9d32ab4e01))


### Features

* initial Ironscales MCP server scaffold ([3d931a4](https://github.com/wyre-technology/ironscales-mcp/commit/3d931a4e4c09b8ca542833f3518a02075c1a269b))
