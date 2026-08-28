# Saloon Platform — Production Release Candidate Manifest

---

## 1. Release Identification

| Attribute | Value |
| :--- | :--- |
| **Release Candidate Version** | `v1.0.0-rc.1` |
| **Monorepo Version** | `0.0.1` |
| **Target Environment** | `production` |
| **Build Date / Timestamp** | `2026-08-20T12:45:00Z` |
| **Release Channel** | `stable-rc` |
| **Git Reference** | `HEAD` (`main` branch) |

---

## 2. Core Toolchain & Runtime Versions

| Tool / Framework | Verified Version |
| :--- | :--- |
| **Node.js** | `v20.x` (Active LTS) |
| **pnpm** | `9.0.0` |
| **Turborepo** | `2.10.8` |
| **NestJS (API Backend)** | `10.3.0` |
| **Next.js (Web Portals)** | `14.2.35` |
| **React** | `18.3.1` |
| **Expo SDK (Mobile)** | `51.0.0` |
| **Prisma ORM** | `5.15.0` |
| **PostgreSQL Engine** | `16-alpine` |
| **Redis Engine** | `7-alpine` |
| **Nginx Reverse Proxy** | `1.25-alpine` |

---

## 3. Container Images & Build Artifacts

| Image Name | Dockerfile Path | Target Tag | Non-Root User |
| :--- | :--- | :--- | :--- |
| `saloon-api` | `apps/api/Dockerfile` | `saloon-api:1.0.0-rc.1` | `node` (UID 1000) |
| `saloon-salon-dashboard` | `apps/salon-dashboard/Dockerfile` | `saloon-salon-dashboard:1.0.0-rc.1` | `node` (UID 1000) |
| `saloon-admin-dashboard` | `apps/admin-dashboard/Dockerfile` | `saloon-admin-dashboard:1.0.0-rc.1` | `node` (UID 1000) |

---

## 4. Database Schema & Migration Baseline

- **Prisma Schema Location**: `packages/database/prisma/schema.prisma`
- **Total Relational Models**: 40+ models across 13 core business domains.
- **Index Count**: 150+ B-Tree and unique constraint indexes.
- **Migration Deployment Command**: `pnpm --filter @saloon/database prisma:migrate:prod` (`prisma migrate deploy`).

---

## 5. Verified Monorepo Quality Metrics

- **API Test Suites**: 256/256 passed (100%).
- **API Unit/Integration Tests**: 1,778/1,778 passed (100%).
- **Portal & Shared Packages**: 100% test pass rate across all 7 workspace packages.
- **Workspace Build**: 10/10 packages built successfully with 0 TypeScript compiler errors.
- **Security Audit**: Zero hardcoded credentials, least-privilege non-root container users, UUIDv4 request correlation, and PII log redaction.
