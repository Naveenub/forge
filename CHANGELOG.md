# Changelog

All notable changes to Forge are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/)

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
