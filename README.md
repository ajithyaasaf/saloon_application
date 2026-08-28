# Salon Booking & Management Platform

A high-performance, multi-tenant SaaS marketplace for salons, spa centers, stylists, and customers.

---

## 🚀 Tech Stack

- **Backend Framework:** NestJS (v10)
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Cache & Storage:** Redis (ioredis)
- **Background Queues:** BullMQ
- **Logger:** Pino (`nestjs-pino`) with `pino-pretty`
- **Validation & Docs:** `class-validator`, `class-transformer`, `@nestjs/swagger` (OpenAPI 3.0)
- **Monorepo Architecture:** `pnpm` workspaces + `Turborepo`
- **Containerization:** Docker & Docker Compose

---

## 📁 Monorepo Directory Structure

```
saloon/
├── apps/
│   ├── api/                    # NestJS REST API application (Backend)
│   ├── customer-mobile/        # React Native / Expo mobile app (Customer)
│   ├── salon-dashboard/        # Next.js web application (Salon Owner & Staff)
│   └── admin-dashboard/        # Next.js web application (Platform Admin)
│
├── packages/
│   ├── database/               # Prisma schema, migrations, seed, and exported client
│   ├── config/                 # Shared environment & app configuration
│   ├── eslint-config/          # Shared ESLint rules
│   ├── typescript-config/      # Shared tsconfig bases
│   ├── shared-types/           # Shared DTOs & TypeScript interfaces
│   └── shared-utils/           # Shared helper functions
│
├── infrastructure/
│   ├── docker/                 # Production Docker container setup
│   ├── nginx/                  # Nginx API Gateway & reverse proxy rules
│   └── deployment/             # Deployment scripts, Helm charts, CI/CD pipelines
│
├── phases documents/           # Project phase specifications (PRD, Architecture, DB Design)
├── docker-compose.yml          # Local development environment (PostgreSQL + Redis + API)
├── pnpm-workspace.yaml         # pnpm workspace definition
├── turbo.json                  # Turborepo task pipeline config
└── README.md                   # Project documentation
```

---

## 🛠️ Getting Started & Setup

### Prerequisites

- **Node.js:** `>= 20.0.0`
- **pnpm:** `>= 9.0.0`
- **Docker & Docker Compose:** For running PostgreSQL and Redis locally

### 1. Installation

Clone the repository and install all monorepo dependencies:

```bash
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` in `apps/api/`:

```bash
cp apps/api/.env.example apps/api/.env
```

### 3. Local Infrastructure (PostgreSQL + Redis)

Spin up PostgreSQL 16 and Redis 7 in Docker:

```bash
docker compose up -d postgres redis
```

### 4. Database Initialization & Prisma Client

Generate the Prisma Client and run initial migrations:

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed baseline database values
pnpm --filter @saloon/database prisma:seed
```

### 5. Running the Application

Start all applications in development mode:

```bash
pnpm dev
```

The NestJS API will be available at:
- **API Base URL:** `http://localhost:3000/api/v1`
- **Swagger Documentation:** `http://localhost:3000/api/docs`
- **Health Overview:** `http://localhost:3000/api/v1/health`
- **Readiness Probe:** `http://localhost:3000/api/v1/health/readiness`
- **Liveness Probe:** `http://localhost:3000/api/v1/health/liveness`

---

## 📜 Available Commands

| Command | Description |
|---|---|
| `pnpm dev` | Run all applications in watch/development mode |
| `pnpm build` | Compile all monorepo packages and applications |
| `pnpm test` | Run tests across all workspace projects |
| `pnpm lint` | Run ESLint checks |
| `pnpm format` | Run Prettier auto-formatting |
| `pnpm prisma:generate` | Generate Prisma Client from schema |
| `pnpm prisma:migrate` | Run Prisma migration in development |
| `pnpm prisma:studio` | Open Prisma Studio GUI for database inspection |

---

## 🏗️ Architecture & Core Guidelines

- **Layered Architecture:** `Controller → Service → Repository → Prisma`
- **Strict Typing:** All request bodies use `class-validator` DTOs.
- **Event-Driven:** Internal domain events are emitted using `@nestjs/event-emitter` **only after** database transactions commit.
- **Structured Error Handling:** Standard error response envelope with machine-readable codes (`DomainException`).
- **Distributed Correlation:** All requests receive a unique `x-request-id` header passed through Pino logs.
