# Contributing to Forge

Thank you for contributing! This guide will get you set up and explain how we work.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/forge.git
cd forge
git remote add upstream https://github.com/your-org/forge.git
```

### 2. Run the setup script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Create a Python virtual environment and install backend deps
- Install frontend Node modules
- Copy `.env.example` → `.env`
- Start Postgres, Redis, and Kafka via Docker Compose
- Run database migrations
- Seed demo data

### 3. Start dev servers

```bash
# Terminal 1 — Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Visit http://localhost:5173

---

## Development Workflow

We use **GitHub Flow**:

```
main          ← production-ready, protected
  └─ develop  ← integration branch
       └─ feat/your-feature
       └─ fix/your-bug
       └─ docs/your-docs
```

1. Sync with upstream: `git fetch upstream && git merge upstream/develop`
2. Branch off `develop`: `git checkout -b feat/your-feature develop`
3. Make changes, write tests, commit
4. Push and open a PR targeting `develop`
5. CI runs automatically; address any failures
6. One approving review required to merge

---

## Commit Conventions

We use **Conventional Commits**:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that's neither fix nor feature |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Examples

```
feat(agents): add retry logic to Security Engineer agent
fix(websocket): handle reconnect on 401 without infinite loop
docs(api): document /pipelines endpoint parameters
test(orchestrator): add unit tests for domain transition guards
chore(deps): bump fastapi to 0.111.0
```

Breaking changes: add `!` after the type — `feat!: rename pipeline API`

---

## Pull Request Process

1. **Title** follows commit conventions: `feat(scope): description`
2. **Description** uses the PR template (auto-filled)
3. **Tests** — all new code must have tests; coverage cannot drop below 85%
4. **Docs** — update relevant docs if you're adding/changing behavior
5. **One approval** required from a maintainer
6. **CI must be green**: lint, type-check, security scan, unit tests, integration tests

### PR Checklist

- [ ] Tests added/updated
- [ ] `ruff` lint passes (`cd backend && ruff check .`)
- [ ] `mypy` type check passes (`mypy app/`)
- [ ] Frontend ESLint passes (`cd frontend && npm run lint`)
- [ ] No secrets or credentials in code
- [ ] CHANGELOG entry added if user-facing change

---

## Coding Standards

### Backend (Python)

- **Style**: [Ruff](https://docs.astral.sh/ruff/) — enforced in CI
- **Types**: All functions must have type annotations; `mypy --strict` must pass
- **Async**: Use `async/await` everywhere; never block the event loop
- **Models**: Pydantic v2 for request/response schemas
- **DB**: SQLAlchemy 2.0 async ORM; always use transactions
- **Errors**: Raise `HTTPException` with clear messages; never swallow exceptions silently

```python
# ✅ Good
async def get_pipeline(pipeline_id: UUID, db: AsyncSession) -> Pipeline:
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline {pipeline_id} not found")
    return pipeline

# ❌ Bad
def get_pipeline(id):
    try:
        return db.query(Pipeline).filter_by(id=id).first()
    except:
        pass
```

### Frontend (React / JavaScript)

- **Style**: ESLint + Prettier — run `npm run lint` before committing
- **Components**: Functional components with hooks only; no class components
- **State**: Local state for UI; avoid prop drilling more than 2 levels
- **No** `any` type in TypeScript (if/when we migrate)
- **Accessibility**: All interactive elements must be keyboard accessible

---

## Testing Requirements

### Backend

Minimum **85% coverage** enforced in CI.

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

- `tests/unit/` — pure unit tests, no DB or network
- `tests/integration/` — tests with real Postgres (via Docker)
- Use `pytest-asyncio` for async tests
- Use `factory_boy` for test fixtures

### Frontend

```bash
cd frontend
npm run test
```

- Component tests with React Testing Library
- No snapshot tests (they break too easily)
- Test behavior, not implementation details

---

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template.

Include:
- Steps to reproduce
- Expected vs actual behavior
- Logs from `docker compose logs` or browser console
- Your OS, browser, Python/Node version

## Requesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template.

Describe the problem you're solving, not just the solution — the maintainers may have a different approach in mind.

---

## Questions?

Open a [Discussion](https://github.com/your-org/forge/discussions) — not an Issue — for general questions.
