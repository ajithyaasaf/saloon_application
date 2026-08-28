# Saloon Platform — Production Rollback Runbook

---

## 1. Rollback Trigger Criteria

Initiate a rollback immediately if any of the following conditions persist for > 3 minutes following a deployment:

1. **Readiness Probe Failure**: `/api/v1/health/readiness` fails repeatedly with HTTP 503.
2. **Elevated Error Rates**: HTTP 5xx errors exceed 5% of total ingress requests.
3. **Core Transaction Blockade**: Booking creation, OTP login, or payment initiation fails consistently.
4. **Data Corruption or Concurrency Invariant Violation**: Anomalies detected in ledger balance or duplicate slot allocations.

---

## 2. Fast Container Rollback Sequence

If database schema changes are backward-compatible (the standard baseline):

### Step 1: Re-point Ingress / Container Version
Revert container images to the previous known stable release tag (e.g. `saloon-api:1.0.0-rc.0`):
```bash
# Update image tags in docker compose or orchestration manifest
docker compose -f infrastructure/deployment/production.compose.yml down
docker compose -f infrastructure/deployment/production.compose.yml up -d
```

### Step 2: Verify Readiness of Restored Version
```bash
curl -fsS https://api.saloon.godivatech.com/api/v1/health/readiness
```

### Step 3: Shift Traffic
Ensure reverse proxy routes all live client traffic to the restored instances.

---

## 3. Database Recovery & Restore Procedure

> [!CAUTION]
> **NEVER** run `prisma migrate reset` or `prisma db push` in a production environment!

If an emergency database restore is required due to catastrophic data corruption during deployment:

### Step 1: Drain Ingress & Place System in Maintenance Mode
```bash
# Temporarily return 503 Maintenance page at Nginx reverse proxy
docker compose -f infrastructure/deployment/production.compose.yml stop api salon-dashboard admin-dashboard
```

### Step 2: Restore from Pre-Deployment Backup
```bash
# Execute safe single-transaction restore
bash infrastructure/deployment/restore-database.sh /var/backups/saloon/postgres/saloon_prod_db_pre_deploy_backup.sql.gz
```

### Step 3: Re-launch Application Containers
```bash
docker compose -f infrastructure/deployment/production.compose.yml up -d
```

### Step 4: Validate Data Consistency
- Verify user sessions, active bookings, and gift card ledger balances.
- Lift maintenance mode at Nginx gateway.

---

## 4. Post-Incident Review & Triage

1. **Capture Diagnostic Artifacts**:
   - Collect Pino application error logs: `docker logs saloon_prod_api > /var/log/saloon/incident_dump.log`.
   - Collect PostgreSQL slow query and error logs.
2. **Log Incident Summary**:
   - Document timestamp of incident, detection vector, duration of degradation, and time to complete recovery.
3. **Draft Root-Cause Analysis (RCA)**:
   - Identify exact code or schema commit causing failure before scheduling hotfix deployment.
