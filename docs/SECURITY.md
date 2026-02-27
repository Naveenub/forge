# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | ✅ Active security patches |
| 1.x     | ⚠️ Critical patches only |
| < 1.0   | ❌ End of life |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please email **security@forge.internal** with:

1. A description of the vulnerability and its potential impact
2. Steps to reproduce (proof of concept if possible)
3. Affected component(s) and version(s)
4. Your suggested fix (optional but appreciated)

You will receive an acknowledgement within **48 hours** and a full response within **7 days**. We follow responsible disclosure — we ask that you give us 90 days to patch before public disclosure.

---

## Security Architecture

### Authentication & Authorisation
- JWT-based authentication with short-lived access tokens (30 min) and rotating refresh tokens (7 days)
- All tokens signed with HS256; secret keys loaded from environment / Vault at startup — never hard-coded
- Role-based access control: `OWNER`, `MANAGER`, `CONTRIBUTOR` — enforced at API layer and service layer
- API keys stored as bcrypt hashes; raw keys never persisted after creation
- Optional TOTP two-factor authentication per user

### Transport Security
- TLS 1.3 enforced at the ingress layer (nginx / AWS ALB)
- HSTS header set with `max-age=63072000; includeSubDomains; preload`
- All inter-service traffic encrypted via mutual TLS inside Kubernetes

### Response Headers (added by `SecurityMiddleware`)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

### Input Validation
- All incoming requests validated with Pydantic v2 before reaching service layer
- SQL injection prevented by SQLAlchemy parameterised queries (no raw string interpolation)
- File upload paths sanitised; content-type allowlist enforced

### Data Protection
- Sensitive config (DB passwords, API keys, JWT secrets) stored in Kubernetes Secrets and injected as environment variables — never in ConfigMaps or source control
- Artifacts stored with AES-256 encryption at rest in object storage
- Audit logs immutable: write-once, append-only table with row-level checksums
- PII fields (email, name) encrypted with a per-tenant key using the `ENCRYPTION_KEY` setting

### Rate Limiting & DoS Protection
- Per-IP rate limiting: 1 000 req/min default (configurable via `RATE_LIMIT_RPM`)
- Burst allowance: 100 requests
- Pipeline creation: 10 concurrent pipelines per workspace
- WebSocket connections: max 50 per user

### Dependency Management
- Pinned dependency versions in `requirements.txt` and `package.json`
- Automated CVE scanning via `safety` (Python) and `npm audit` (Node) in CI
- Dependabot configured for weekly automated PRs

### Container Security
- Non-root user (`forge:1000`) in all Dockerfiles
- Read-only root filesystem in Kubernetes pods
- `securityContext.allowPrivilegeEscalation: false`
- `securityContext.capabilities.drop: ["ALL"]`
- Network policies restricting pod-to-pod traffic to explicit allowlist

### Secrets Management
- Production secrets managed via HashiCorp Vault (optional) or Kubernetes Secrets
- Secret rotation via `VAULT_TOKEN` + dynamic database credentials supported
- Never log secrets — `SecurityMiddleware` strips `Authorization` headers from audit logs

---

## Security Scanning in CI

Every pull request runs:

```
bandit -r backend/app -ll --confidence-level medium   # SAST
safety check -r backend/requirements.txt              # CVE scan
ruff check backend/app --select S                     # Flake8-bandit rules
npm audit --audit-level=high                          # Node CVE scan
```

The pipeline blocks on any `HIGH` or `CRITICAL` finding.

---

## Incident Response

1. **Detect** — Alert fires from Prometheus / Grafana (see `infrastructure/monitoring/alerts.yml`)
2. **Contain** — Block affected IP / revoke compromised API keys via `POST /api/v1/auth/keys/{id}/revoke`
3. **Eradicate** — Patch, redeploy with `make deploy-production`
4. **Recover** — Restore from last clean backup using `scripts/restore.sh`
5. **Post-mortem** — Document in `docs/incidents/YYYY-MM-DD-title.md`

See `docs/RUNBOOK.md` for step-by-step incident playbooks.

---

## Bug Bounty

We do not currently run a formal bug bounty programme. However, researchers who responsibly disclose valid vulnerabilities will be credited in our release notes (with permission).

---

*Last updated: February 2026*
