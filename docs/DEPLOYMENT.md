# Deployment Guide

## Local Development

```bash
# One-command setup
bash scripts/setup.sh

# Or manually
make install
make docker-up
make migrate
make seed
make dev
```

| Service   | URL                          |
|-----------|------------------------------|
| Dashboard | http://localhost:3000        |
| API       | http://localhost:8000        |
| API Docs  | http://localhost:8000/docs   |
| Grafana   | http://localhost:3001        |
| Prometheus| http://localhost:9090        |

---

## Docker Compose (Staging)

```bash
cd infrastructure/docker
cp ../../.env.example ../../.env   # fill in secrets
docker compose up -d
```

---

## Kubernetes

### Prerequisites
- `kubectl` configured for your cluster
- Helm 3.x
- cert-manager installed (for TLS)

### 1. Create namespace & secrets

```bash
kubectl apply -f infrastructure/k8s/namespace.yaml

kubectl create secret generic forge-secrets \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=redis-url=$REDIS_URL \
  -n forge
```

### 2. Apply config & deployment

```bash
kubectl apply -f infrastructure/k8s/configmap.yaml
kubectl apply -f infrastructure/k8s/deployment.yaml -n forge
kubectl rollout status deployment/forge-backend -n forge
```

### 3. Verify

```bash
kubectl get pods -n forge
kubectl get svc  -n forge
kubectl get ingress -n forge
```

---

## Helm (Production)

### Install

```bash
helm lint infrastructure/helm/forge/

helm upgrade --install forge infrastructure/helm/forge/ \
  --namespace forge \
  --create-namespace \
  --set ingress.host=forge.your-domain.com \
  --set ingress.tls=true \
  --set backend.image.tag=v2.0.0 \
  --set frontend.image.tag=v2.0.0 \
  --wait
```

### Upgrade

```bash
helm upgrade forge infrastructure/helm/forge/ \
  --namespace forge \
  --set backend.image.tag=$NEW_TAG \
  --set frontend.image.tag=$NEW_TAG \
  --wait --timeout 10m
```

### Rollback

```bash
helm history forge -n forge
helm rollback forge <REVISION> -n forge
```

---

## Blue-Green (CI/CD)

The `deploy.yml` GitHub Actions workflow handles blue-green automatically:

1. Determines current color (blue/green)
2. Deploys new color with `helm upgrade --install forge-<color>`
3. Runs health check against new deployment
4. Switches traffic via ingress patch
5. Tears down old color
6. Auto-rollbacks if health check fails

Trigger: push to `main` branch.

---

## Environment Variables

See [`.env.example`](../.env.example) for all 30+ variables with descriptions.

**Required for any deployment:**

| Variable            | Description                    |
|---------------------|--------------------------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key         |
| `DATABASE_URL`      | PostgreSQL connection string   |
| `JWT_SECRET`        | Random 256-bit secret          |
| `REDIS_URL`         | Redis connection string        |

---

## Scaling

| Component       | Min | Max | Trigger              |
|-----------------|-----|-----|----------------------|
| Backend pods    | 3   | 50  | CPU > 70%            |
| Worker pods     | 5   | 100 | CPU > 70% / Kafka lag|

```bash
# Manual scale
kubectl scale deployment forge-backend -n forge --replicas=10

# Check HPA
kubectl get hpa -n forge
```

---

## Health Checks

```bash
# Local
bash scripts/health_check.sh

# K8s
kubectl exec -n forge deploy/forge-backend -- curl -s localhost:8000/health
```

---

## Database Migrations

```bash
# Local
make migrate

# K8s (run as job)
kubectl run forge-migrate \
  --image=forge-backend:latest \
  --restart=Never \
  --env-from=secret/forge-secrets \
  -n forge \
  -- alembic upgrade head
```
