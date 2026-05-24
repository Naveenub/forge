# Changelog

All notable changes to Forge are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [3.1.0] — 2026-05-24

### Security
- Upgraded `cryptography` from `46.0.6` → `46.0.7` — fixes buffer overflow when non-contiguous buffers passed to APIs like `Hash.update()` on Python >3.11 (CVE, affects `cryptography >= 45.0.0`)
- Upgraded `python-multipart` from `0.0.26` → `0.0.27` — fixes denial of service via unbounded multipart part headers (no limit on header count or header size allowed CPU exhaustion on FastAPI/Starlette)
- Upgraded `vite` from `5.x` → `8.0.14` (via Dependabot PR #10) — fixes path traversal in optimised deps `.map` handling
- Redacted plaintext password logging in `backend/seed.py` — was logging demo account passwords to stdout; now logs `[see .env.example]` (CodeQL alert #16, CWE-532)

### Fixed
- `manualChunks` in `vite.config.js` — Vite 8 switched to Rolldown which requires `manualChunks` to be a function, not an object; was causing `TypeError: manualChunks is not a function` and breaking all frontend builds
- `@vitejs/plugin-react` upgraded from `^4.3.1` → `^6.0.2` to match Vite 8 peer dependency requirements; v4 only supports up to Vite 7
- `package-lock.json` regenerated after `@vitejs/plugin-react` upgrade — stale lock file was causing `ERESOLVE` peer dependency conflicts in CI
- Frontend test command in `deploy.yml` corrected from `npm run test:ci:ci` → `npm run test:ci` (double `:ci` introduced during edit)
- `deploy-staging` and `deploy-production` jobs now skip gracefully when `KUBE_CONFIG_STAGING` / `KUBE_CONFIG_PRODUCTION` secrets are absent instead of failing with `Input required and not supplied: kubeconfig`
- `workflow_dispatch` trigger added to `deploy.yml` — Emergency Rollback job was unreachable because the trigger was missing; "Run workflow" button now appears in GitHub Actions UI

### Changed
- `frontend/nginx.conf` hardened — added `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` security headers; unified `gzip_min_length` and `try_files $uri =404` across all three nginx.conf copies (`frontend/`, `infrastructure/docker/`, `infrastructure/docker/nginx/`)
- Frontend test command in `deploy.yml` aligned with `pr-checks.yml` — both now use `npm run test:ci` (`--reporter=verbose`) for consistent CI output
- `deploy.yml` frontend test step uses `npm run test:ci` instead of `npm test` for verbose reporter output consistent with `pr-checks.yml`

---

## [3.0.0] — 2026-05-23

### Added
- CI/CD deploy gate documentation in README — staging on `develop` branch push, production on GitHub Release publish (blue-green)
- Release badge in README header linking to v3.0.0
- `workflow_dispatch` input scaffold for Emergency Rollback (completed in v3.1.0)

### Fixed
- `frontend/nginx.conf` missing security headers — now consistent with infrastructure configs
- Three nginx.conf copies unified across `frontend/`, `infrastructure/docker/`, `infrastructure/docker/nginx/`

### Changed
- README deployment section expanded with trigger table and step-by-step production release instructions

---

## [2.0.0] — 2025-02-22

### Added
- Full login screen with demo account quick-sign-in
- Account info dropdown with Profile Settings, Security & 2FA, API Keys, Audit Log panels
- Security & 2FA panel: TOTP toggle, password change, active session management with revoke
- API Keys panel: create keys with scope selector, revoke, copy-to-clipboard generated key
- Audit Log panel: filterable/searchable immutable event log with CSV export
- Profile Settings panel: edit name/email, notification prefs
- Workspace add/remove with color picker and delete confirmation modal
- "Run Pipeline" confirmation modal with domain overview before launch
- "View Artifacts" navigation button wired to Artifacts tab
- Artifacts tab: type filter, syntax-highlighted viewer, download button, lock artifact action
- Monitor tab: live sparkline charts (3s refresh with jitter), service health table, SLA display
- Settings tab: 5 sub-tabs (Agents, Governance, Notifications, Deployment, Security) with live save
- Pipeline tab: project selector tabs, per-project pipeline visualization

### Fixed
- `useRef` called inside `Array.from` (Rules of Hooks violation) — caused entire LoginScreen crash
- Double-scrollbar layout from `minHeight: 100vh` + inner `overflow: auto`
- Inline `animation:` styles not triggering — moved to CSS classes
- `key={i}` on dynamic log list causing React reconciliation stale renders
- Missing `type="button"` on all buttons
- Modal inside flex layout causing stacking context issues
- Interval restart on every pause/resume resetting log counter from beginning

---

## [1.0.0] — 2025-01-15

### Added
- Initial release: 15-agent autonomous SDLC pipeline
- FastAPI backend with WebSocket log streaming
- React dashboard with Pipeline, Artifacts, Monitor, Settings views
- Agent hierarchy: Execute → Review → Approve across 5 domains
- Governance approval queue
- Immutable artifact locking with SHA-256 checksums
- K8s deployment with HPA, PDB, NetworkPolicy
- Helm chart for production deployment
- GitHub Actions CI/CD with blue-green deploy and auto-rollback
- Prometheus metrics + Grafana dashboards