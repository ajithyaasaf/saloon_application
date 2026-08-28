# Saloon Platform — Production Deployment Runbook

---

## 1. Pre-Deployment Checklist

Before initiating a production release:

1. **Verify Release Candidate**: Ensure all monorepo test suites pass (`pnpm test`) and full build succeeds (`pnpm turbo run build`).
2. **Database Snapshot**: Take an immediate pre-deployment database snapshot:
   ```bash
   bash infrastructure/deployment/backup-database.sh
   ```
3. **Secrets Confirmation**: Ensure all production secrets in `.env.production` are populated and meet minimum length constraints (e.g. `JWT_ACCESS_SECRET >= 32 chars`).
4. **Maintenance Window Notification**: Notify support and ops teams if deploying non-backward-compatible schema updates.

---

## 2. Zero-Downtime Deployment Sequence

```
Step 1: Build & Package Docker Images
   │
   ▼
Step 2: Execute Database Migrations (`prisma migrate deploy`)
   │
   ▼
Step 3: Start New Application Containers (`api`, `salon-dashboard`, `admin-dashboard`)
   │
   ▼
Step 4: Await Health & Readiness Confirmation (`/api/v1/health/readiness`)
   │
   ▼
Step 5: Shift Ingress Traffic via Nginx / Load Balancer
   │
   ▼
Step 6: Drain Connections from Old Application Instances (Graceful Shutdown)
   │
   ▼
Step 7: Execute Post-Deployment Smoke Tests
```

---

## 3. Step-by-Step Execution Commands

### A. Run Database Migrations
```bash
# Execute only versioned, pending migrations (NEVER prisma db push or reset)
pnpm --filter @saloon/database prisma:migrate:prod
```

### B. Launch Production Containers
```bash
docker compose -f infrastructure/deployment/production.compose.yml up -d --build
```

### C. Verify Health & Readiness Probes
```bash
# Verify API overall status
curl -fsS https://api.saloon.godivatech.com/api/v1/health

# Verify Readiness (ensures DB & Redis connection pools are healthy)
curl -fsS https://api.saloon.godivatech.com/api/v1/health/readiness

# Verify Liveness
curl -fsS https://api.saloon.godivatech.com/api/v1/health/liveness
```

---

## 4. Post-Deployment Smoke Testing

Execute safe, non-destructive smoke tests:

1. **Public Salon Catalog**: Query active salons:
   ```bash
   curl -fsS https://api.saloon.godivatech.com/api/v1/salons?limit=5
   ```
2. **Portal Accessibility**:
   - Access `https://salon.saloon.godivatech.com/login` (Status: `200 OK`).
   - Access `https://admin.saloon.godivatech.com/login` (Status: `200 OK`).
3. **Log Stream Verification**:
   - Confirm structured JSON logs contain `requestId`, `level`, and no unredacted authorization secrets.

---

## 5. Post-Deployment Monitoring & Alert Thresholds

| Metric / Event | Warning Threshold | Critical Alarm Threshold | Action |
| :--- | :--- | :--- | :--- |
| **HTTP 5xx Error Rate** | > 1% for 5 mins | > 5% for 2 mins | Review error logs; trigger rollback if unrecoverable |
| **P95 API Latency** | > 500ms for 5 mins | > 1500ms for 3 mins | Check database connection pool and query load |
| **Redis Health** | Ping timeout > 1s | Connection dropped | Check Redis memory and network peering |
| **Queue Backlog** | > 500 pending jobs | > 2000 pending jobs | Scale BullMQ worker instances |

---

## 6. Emergency Contacts & Escalation Matrix

- **Lead DevOps Engineer**: `ops-lead@godivatech.com` (Placeholder)
- **Database Administrator**: `dba@godivatech.com` (Placeholder)
- **Security Officer**: `security@godivatech.com` (Placeholder)
- **Incident Escalation Bridge**: `https://meet.godivatech.com/ops-incident` (Placeholder)
