# API Reference

Base URL: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/api/docs`

## Authentication

All endpoints (except `/api/v1/health`) require a JWT Bearer token:

```
Authorization: Bearer <token>
```

Obtain a token via POST `/api/v1/auth/login`.

---

## Endpoints

### System
| Method | Path             | Description                                 |
| ------ | ---------------- | ------------------------------------------- |
| GET    | `/api/v1/health` | Health check — returns agent count, version |

### Workspaces
| Method | Path                 | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/v1/workspaces` | List all workspaces                  |
| POST   | `/api/v1/workspaces` | Create a workspace                   |
| DELETE | `/api/v1/workspaces/{id}` | Delete workspace + all projects |

### Projects
| Method | Path                                  | Description                |
| ------ | ------------------------------------- | -------------------------- |
| GET    | `/api/v1/workspaces/{ws_id}/projects` | List projects in workspace |
| POST   | `/api/v1/workspaces/{ws_id}/projects` | Create a project           |
| GET    | `/api/v1/projects/{id}`               | Get project details        |
| DELETE | `/api/v1/projects/{id}`               | Delete project             |

### Pipelines
| Method | Path                            | Description             |
| ------ | ------------------------------- | ----------------------- |
| POST   | `/api/v1/pipelines`             | Start a new pipeline    |
| GET    | `/api/v1/pipelines/{id}`        | Get pipeline status     |
| POST   | `/api/v1/pipelines/{id}/cancel` | Cancel running pipeline |

### Approvals
| Method | Path                            | Description                             |
| ------ | ------------------------------- | --------------------------------------- |
| GET    | `/api/v1/approvals`             | List pending approvals for current user |
| POST   | `/api/v1/approvals/{id}/decide` | Approve or reject                       |

### Artifacts
| Method | Path                               | Description                   |
| ------ | ---------------------------------- | ----------------------------- |
| GET    | `/api/v1/pipelines/{id}/artifacts` | List artifacts for a pipeline |
| GET    | `/api/v1/artifacts/{id}`           | Get artifact metadata         | 
| GET    | `/api/v1/artifacts/{id}/download`  | Get pre-signed download URL   |

### Agents
| Method | Path             | Description                                 |
| ------ | ---------------- | ------------------------------------------- |
| GET    | `/api/v1/agents` | List all 15 agents and their current status |

### Metrics
| Method | Path                             | Description                        |
| ------ | -------------------------------- | ---------------------------------- |
| GET    | `/api/v1/metrics/workspace/{id}` | Live infra metrics for a workspace |
| GET    | `/api/v1/metrics/audit`          | Paginated audit log                |

### WebSocket
| Path                                   | Description                |
| -------------------------------------- | -------------------------- |
| `ws://localhost:8000/ws/{pipeline_id}` | Real-time agent log stream |

---

## Example Requests

### Start a pipeline
```bash
curl -X POST http://localhost:8000/api/v1/pipelines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "proj-001", "triggered_by": "user"}'
```

### Approve a governance gate
```bash
curl -X POST http://localhost:8000/api/v1/approvals/APR-041/decide \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision": "approved", "comment": "Architecture looks solid."}'
```

### Stream pipeline logs (WebSocket)
```js
const ws = new WebSocket("ws://localhost:8000/ws/pipe-001");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```
