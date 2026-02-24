### Agent Reference

The 15 Agents

Each domain has 3 agents in a strict hierarchy. No stage proceeds without the level above signing off.

---

## Architecture Domain

| Level	  | Agent	        | Responsibility                                                                          |
| ------- | ------------- | --------------------------------------------------------------------------------------- |
| Execute	| Architect	    | Reads requirements, produces system design, DB schema, API contracts, component diagram |
| Review	| Sr. Architect	| Reviews design for scalability, maintainability, anti-patterns                          |
| Approve	| Arch Approval	| Final sign-off — locks the architecture blueprint as an immutable artifact              |

---

## Development Domain

| Level	  | Agent	        | Responsibility                                              |
| ------- | ------------- | ----------------------------------------------------------- |
| Execute	| Developer	    | Generates production code from approved architecture        |
| Review	| Sr. Developer	| Code review: logic, performance, patterns, security hygiene |
| Approve	| Dev Manager	  | Approves code for QA; tags release artifact                 |

---

## Testing Domain

| Level	  | Agent	      | Responsibility                                                    |
| ------- | ----------- | ----------------------------------------------------------------- |
| Execute	| Tester	    | Generates unit, integration, and E2E test suites                  | 
| Review	| Sr. Tester	| Reviews test coverage, edge cases, flaky test elimination         | 
| Approve	| QA Manager	| Signs off if coverage ≥ threshold; clears build for security scan |

---

## Security Domain

| Level	  | Agent	        | Responsibility                                       |
| ------- | ------------- | ---------------------------------------------------- |
| Execute	| Sec Engineer	| OWASP Top 10 scan, SAST, dependency audit            | 
| Review	| Sr. Security	| Triage findings, remove false positives, assess risk |
| Approve	| Sec Manager	  | Production clearance; blocks on unresolved criticals |

---

## DevOps Domain

| Level	  | Agent	        | Responsibility                                                  |  
| ------- | ------------- | --------------------------------------------------------------- |
| Execute	| Cloud Eng	    | Generates Dockerfile, K8s manifests, Helm chart, CI/CD pipeline | 
| Review	| Cloud Lead	  | Reviews infra for cost, security groups, HA, DR                 | 
| Approve	| Cloud Manager	| Authorizes production deployment                                |

---

### Agent Prompt Structure

Each agent call includes:

1. System prompt: Role definition, constraints, output format
2. Context: Project name, requirements, previous domain outputs
3. Artifacts: All artifacts from preceding stages (read-only)
4. Instruction: Specific task for this level

---

## Governance Rules

* Approval agents may reject even if the execute agent succeeded
* A rejection halts the pipeline; the human operator must decide to retry or abandon
* All agent outputs are appended to the immutable audit log
* No agent can modify an artifact from a previous domain
