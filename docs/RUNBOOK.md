# Forge — Operations Runbook

## Quick Reference

| Alert | Severity | Response | Runbook |
|-------|----------|----------|---------|
| APIDown | Critical | Immediate | [API Down](#api-down) |
| HighErrorRate | Critical | < 5 min | [Error Rate](#high-error-rate) |
| PipelineFailureRate | Warning | < 30 min | [Pipeline Failures](#pipeline-failures) |
| AgentTimeout | Warning | < 1 hour | [Agent Timeouts](#agent-timeouts) |
| KafkaConsumerLag | Warning | < 1 hour | [Kafka Lag](#kafka-consumer-lag) |
| DatabaseConnectionPoolExhausted | Critical | Immediate | [DB Pool](#database-connection-pool) |
| SLOBreach | Critical | Immediate | [SLO](#slo-breach) |

---

## API Down

**Symptoms:** `up{job="forge-backend"} == 0`, health checks failing

**Steps:**
```bash
# 1. Check pod status
kubectl get pods -n forge -l app.kubernetes.io/component=backend

# 2. Check recent events
kubectl describe deployment forge-backend -n forge
kubectl get events -n forge --sort-by='.metadata.creationTimestamp' | tail -20

# 3. Check logs
kubectl logs -n forge -l app.kubernetes.io/component=backend --tail=200

# 4. Check resource constraints
kubectl top pods -n forge

# 5. Force rollout restart
kubectl rollout restart deployment/forge-backend -n forge
kubectl rollout status deployment/forge-backend -n forge --timeout=5m
```

**Rollback if restart fails:**
```bash
helm history forge -n forge
helm rollback forge <PREVIOUS_REVISION> -n forge --wait
```

---

## High Error Rate

**Symptoms:** 5xx responses > 5% of traffic

**Steps:**
```bash
# 1. Check which endpoints are failing
kubectl logs -n forge -l app=forge-backend --tail=500 | grep '"status_code": 5'

# 2. Check DB connectivity
kubectl exec -n forge deploy/forge-backend -- python -c \
  "import asyncio; from app.core.database import _engine_write; ..."

# 3. Check Redis
kubectl exec -n forge deploy/forge-backend -- \
  python -c "import redis; r=redis.from_url('$REDIS_URL'); print(r.ping())"

# 4. Tail application errors
kubectl logs -n forge -l app=forge-backend -f | grep -i error
```

---

## Pipeline Failures

**Symptoms:** > 20% of pipelines failing in 1h window

**Steps:**
```bash
# 1. Check recent failed pipelines in DB
kubectl exec -n forge deploy/forge-backend -- \
  python -c "
from app.db.session import *
# Query for recent failures
"

# 2. Check agent logs for the failed pipelines
# Look for Anthropic API errors, timeouts, or parsing failures

# 3. Check Anthropic API status
curl https://status.anthropic.com/api/v2/status.json

# 4. Check ANTHROPIC_API_KEY is valid
kubectl get secret forge-secrets -n forge -o jsonpath='{.data.anthropic-api-key}' | base64 -d | head -c 10
```

---

## Agent Timeouts

**Symptoms:** `forge_agent_timeouts_total` increasing, pipeline stuck

**Steps:**
```bash
# 1. Check current timeout setting
kubectl get configmap forge-config -n forge -o yaml | grep AGENT_TIMEOUT

# 2. Temporarily increase timeout (hot patch)
kubectl set env deployment/forge-backend AGENT_TIMEOUT_SECONDS=600 -n forge

# 3. Check if it's a specific agent/domain
# Look for pattern in timeout agent names

# 4. Check Anthropic rate limits
# Exponential backoff is automatic, but check if hitting hard limits
```

---

## Kafka Consumer Lag

**Symptoms:** Consumer lag > 5000 messages, pipelines backing up

**Steps:**
```bash
# 1. Check consumer group status
kubectl exec -n forge deploy/forge-backend -- \
  python -c "from app.core.kafka_client import get_consumer_group_offsets; ..."

# 2. Check number of running pipeline workers
kubectl get pods -n forge -l app.kubernetes.io/component=backend | grep Running | wc -l

# 3. Scale up backend to process faster
kubectl scale deployment forge-backend -n forge --replicas=10

# 4. Check for poison pill messages
# Look for messages causing repeated failures
```

---

## Database Connection Pool

**Symptoms:** Pool utilisation > 90%, new requests timing out

**Steps:**
```bash
# 1. Check active DB connections
kubectl exec -n forge deploy/forge-backend -- psql $DATABASE_URL \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 2. Kill idle connections > 10 minutes
kubectl exec -n forge deploy/forge-backend -- psql $DATABASE_URL \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"

# 3. Temporarily reduce pool size to force reconnect
kubectl set env deployment/forge-backend DB_POOL_SIZE=5 -n forge
# Then restore
kubectl set env deployment/forge-backend DB_POOL_SIZE=20 -n forge

# 4. Check for long-running transactions
kubectl exec -n forge deploy/forge-backend -- psql $DATABASE_URL \
  -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
```

---

## SLO Breach

**Symptoms:** 30-day availability < 99.9%

**Steps:**
1. Identify the root cause from historical alerts
2. Open a post-mortem document immediately
3. Notify stakeholders via `#forge-incidents` Slack channel
4. Implement fix and monitor for 24h before closing incident

**Post-mortem template:** `docs/POST_MORTEM_TEMPLATE.md`

---

## Useful One-Liners

```bash
# Live pipeline status breakdown
kubectl exec -n forge deploy/forge-backend -- psql $DATABASE_URL \
  -c "SELECT status, count(*) FROM pipelines GROUP BY status ORDER BY count DESC;"

# Recent audit log entries (last 50)
kubectl exec -n forge deploy/forge-backend -- psql $DATABASE_URL \
  -c "SELECT timestamp, action, resource_type, resource_id FROM audit_logs ORDER BY timestamp DESC LIMIT 50;"

# Force-complete a stuck pipeline (emergency only)
kubectl exec -n forge deploy/forge-backend -- psql $DATABASE_URL \
  -c "UPDATE pipelines SET status='failed', completed_at=NOW() WHERE id='<PIPELINE_ID>';"

# Check Helm release status
helm status forge -n forge

# View all forge resources
kubectl get all -n forge

# Stream all backend logs
kubectl logs -n forge -l app.kubernetes.io/component=backend -f --max-log-requests=5
```

---

## Escalation Path

1. **L1 (On-call engineer):** Checks dashboards, runs standard runbook steps
2. **L2 (Senior engineer):** Called if not resolved in 30 min for critical / 2h for warning
3. **L3 (Engineering lead):** SLO breach, data loss risk, or cascading failure

Slack: `#forge-oncall` | PagerDuty: forge-production | Email: oncall@forge.example.com
