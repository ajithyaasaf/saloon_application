# Phase 14.0 — Payments & Refunds Architecture Blueprint

**Module Name**: `PaymentModule`  
**Document Version**: `v1.1.0` (FROZEN - ENHANCED)  
**Target Release**: Production Multi-Tenant Salon Engine  
**Author**: Lead Principal Systems & Security Architect  

---

## 1. Executive Summary

Phase 14 defines the architectural blueprint for the **Payments & Refunds Module** of the multi-tenant SaaS salon management platform. The module provides a unified, provider-agnostic engine capable of handling online gateway payments (with **Cashfree** as the primary implementation), offline walk-in cash transactions, split/partial payments, refunds, tax-compliant invoicing (GST ready with revision history & credit notes), settlement tracking, and multi-tier audit trails.

### Core Architectural Guarantees
1. **100% Provider Independence**: The Domain and Service layers possess ZERO imports or dependencies on Cashfree, Razorpay, Stripe, or any third-party gateway SDK. All provider operations are isolated behind the `IPaymentGateway` interface contract in Infrastructure.
2. **Double-Payment & Replay Immunity**: Built-in idempotency keys, atomic transaction locks, and duplicate webhook deduplication prevent race conditions between customer browser redirects and async webhook notifications.
3. **Strict Transaction Boundaries**: All state changes execute inside `TransactionService.run()`. Third-party gateway API calls, Redis caching, EventBus publishing, and notifications strictly occur **outside** database transactions.
4. **GST-Ready Invoicing & Revisions**: Automated tax calculation engine for CGST, SGST, IGST, and international VAT, combined with tamper-proof sequential invoice numbering per salon branch and credit note revisions.
5. **Multi-Attempt & Settlement Governance**: Clear architectural distinction between the business `Payment` aggregate, gateway checkout `PaymentAttempt` sessions, provider `PaymentTransaction` records, and backend `Settlement` payout references.

---

## 2. Domain Boundaries & Aggregate Root

The **Payment** aggregate root encapsulates all payment attempts, line items, transaction logs, refunds, settlements, and issued invoices associated with a `Booking`.

```
                                ┌─────────────────────────┐
                                │     Payment (Root)      │
                                └────────────┬────────────┘
                                             │
      ┌───────────────────┬──────────────────┼───────────────────┬───────────────────┐
      ▼                   ▼                  ▼                   ▼                   ▼
┌──────────────┐  ┌───────────────┐   ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐
│PaymentAttempt│  │PaymentTransact│   │   Refund    │   │     Invoice     │   │ Settlement  │
└──────────────┘  └───────────────┘   └─────────────┘   └────────┬────────┘   └─────────────┘
      │                   │                  │                   │                   │
      ▼                   ▼                  ▼                   ▼                   ▼
┌──────────────┐  ┌───────────────┐   ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐
│PaymentIntent │  │  WebhookLog   │   │PaymentAudit │   │ InvoiceRevision │   │SettlementItem│
└──────────────┘  └───────────────┘   └─────────────┘   └─────────────────┘   └─────────────┘
```

### Domain Relationships
- **Booking (1 : 0..1)**: Each `Booking` references a primary `Payment`. Multiple checkout attempts link to the `Payment` aggregate via `PaymentAttempt`.
- **PaymentAttempt (1 : N)**: Customer checkout sessions. A customer may retry payment multiple times before succeeding.
- **PaymentTransaction (1 : N)**: Confirmed provider-level transaction records returned by payment gateways.
- **Settlement (N : 1)**: Merchant payout references linking provider settlements to salon bank accounts.
- **Invoice & Revisions (1 : N)**: Immutable billing invoices supporting credit notes and tax revision history.
- **Salon / Branch (N : 1)**: Tenant isolation for financial reporting.
- **User / Customer (N : 1)**: Customer payment history and billing profile.

---

## 3. Payment Gateway Abstraction Strategy

To ensure zero vendor lock-in, the payment architecture decouples the core domain from third-party gateway SDKs using the Adapter / Strategy Pattern.

```
┌─────────────────────────────────────────────────────────┐
│                    Domain Services                      │
│             (BookingService / PaymentService)            │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              IPaymentGateway (Interface)                │
│    createOrder(), verifyWebhook(), initRefund(), ...    │
└────────────────────────────┬────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│CashfreeProvider │ │RazorpayProvider │ │ OfflineCashProv │
│ (Infrastructure)│ │ (Infrastructure)│ │ (Infrastructure)│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Abstraction Rules
- `IPaymentGateway` lives in `apps/api/src/domains/payment/interfaces/payment-gateway.interface.ts`.
- Gateway implementations live exclusively in `apps/api/src/infrastructure/payment/providers/`.
- Domain services instantiate providers dynamically via `PaymentGatewayFactory` based on salon configuration or request payload.
- Switching from Cashfree to Razorpay or Stripe requires zero changes to Domain, Repository, Controller, or DTO layers.

---

## 4. Database Entity Model

### 4.1 Payment Model (Aggregate Root)
| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key (`pay_...` format or UUID) |
| `paymentCode` | String | No | Unique human-readable code (e.g. `PAY-20260807-X9A2`) |
| `bookingId` | String (UUID) | No | Foreign Key to `Booking` |
| `salonId` | String (UUID) | No | Tenant isolation Foreign Key to `Salon` |
| `branchId` | String (UUID) | No | Branch Foreign Key to `Branch` |
| `customerId` | String (UUID) | No | Customer Foreign Key to `User` |
| `status` | PaymentStatus | No | Current payment state (default: `UNPAID`) |
| `paymentMethod` | PaymentMethod | No | Primary payment method (`CASH`, `UPI`, `CARD`, etc.) |
| `provider` | PaymentProvider | No | Active provider (`CASHFREE`, `RAZORPAY`, `MANUAL`, etc.) |
| `currency` | String | No | ISO 4217 Currency Code (default: `INR`) |
| `amountTotal` | Int | No | Total payable amount in minor units (e.g., Paise/Cents) |
| `amountPaid` | Int | No | Total confirmed paid amount in minor units (default: 0) |
| `amountRefunded` | Int | No | Total refunded amount in minor units (default: 0) |
| `amountDue` | Int | No | Outstanding due amount in minor units |
| `isPartialAllowed` | Boolean | No | Whether partial deposit payments are permitted |
| `idempotencyKey` | String | No | Unique key preventing duplicate payment creation |
| `version` | Int | No | Optimistic locking counter (starts at 1) |
| `createdByUserId` | String (UUID) | No | User who initiated payment |
| `updatedByUserId` | String (UUID) | Yes | User who last updated payment |
| `createdAt` | DateTime | No | Creation timestamp UTC |
| `updatedAt` | DateTime | No | Last update timestamp UTC |
| `deletedAt` | DateTime | Yes | Soft delete timestamp UTC |

### 4.2 PaymentAttempt Model
Tracks individual gateway checkout sessions initiated by the customer before payment finalization.

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `paymentId` | String (UUID) | No | Foreign Key to `Payment` |
| `attemptNumber` | Int | No | Sequential attempt index (1, 2, 3...) |
| `gatewaySessionId` | String | No | Gateway session ID (e.g., `cf_session_...`) |
| `provider` | PaymentProvider | No | Gateway used |
| `amount` | Int | No | Attempt amount in minor units |
| `status` | PaymentStatus | No | State (`PENDING`, `AUTHORIZED`, `FAILED`, `EXPIRED`) |
| `failureReason` | String | Yes | Decline or failure message |
| `expiresAt` | DateTime | No | Session expiry timestamp UTC |
| `createdAt` | DateTime | No | Creation timestamp UTC |

### 4.3 PaymentTransaction Model
Logs confirmed provider-level transaction records.

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `paymentId` | String (UUID) | No | Foreign Key to `Payment` |
| `paymentAttemptId` | String (UUID) | Yes | Foreign Key to `PaymentAttempt` |
| `providerTransactionId` | String | No | Gateway payment ID (e.g. `cf_pay_...`) |
| `gatewayReference` | String | Yes | Provider reference string |
| `paymentMethod` | PaymentMethod | No | Specific method used (`UPI_INTENT`, `CARD`, etc.) |
| `provider` | PaymentProvider | No | Gateway used |
| `amount` | Int | No | Confirmed transaction amount in minor units |
| `status` | PaymentStatus | No | State (`PAID`, `FAILED`) |
| `rawPayload` | Json | Yes | Sanitized raw webhook/callback payload |
| `processedAt` | DateTime | No | Finalization timestamp UTC |
| `createdAt` | DateTime | No | Creation timestamp UTC |

### 4.4 Refund Model
| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `refundCode` | String | No | Unique code (e.g. `RFD-20260807-B812`) |
| `paymentId` | String (UUID) | No | Foreign Key to `Payment` |
| `bookingId` | String (UUID) | No | Foreign Key to `Booking` |
| `gatewayRefundId` | String | Yes | Gateway reference ID (e.g. `cf_rfd_...`) |
| `amount` | Int | No | Refund amount in minor units |
| `currency` | String | No | Currency code |
| `status` | RefundStatus | No | Refund state (`PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`) |
| `reason` | String | Yes | Mandatory business reason |
| `processedByUserId` | String (UUID) | No | User issuing refund |
| `version` | Int | No | Optimistic locking counter |
| `createdAt` | DateTime | No | Creation timestamp UTC |
| `updatedAt` | DateTime | No | Last update timestamp UTC |

### 4.5 Invoice & InvoiceRevision Models
Tax-compliant billing document supporting credit notes and revisions.

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `invoiceNumber` | String | No | Sequential branch number (e.g. `INV-SAL01-2026-0042`) |
| `paymentId` | String (UUID) | No | Foreign Key to `Payment` |
| `bookingId` | String (UUID) | No | Foreign Key to `Booking` |
| `salonId` | String (UUID) | No | Salon ID |
| `branchId` | String (UUID) | No | Branch ID |
| `customerId` | String (UUID) | No | Customer User ID |
| `subtotal` | Int | No | Subtotal in minor units |
| `cgst` | Int | No | CGST in minor units |
| `sgst` | Int | No | SGST in minor units |
| `igst` | Int | No | IGST in minor units |
| `taxTotal` | Int | No | Tax total in minor units |
| `discount` | Int | No | Discount in minor units |
| `grandTotal` | Int | No | Final total in minor units |
| `status` | InvoiceStatus | No | Status (`DRAFT`, `ISSUED`, `PAID`, `VOIDED`, `CANCELLED`) |
| `isCreditNote` | Boolean | No | Whether invoice is a credit note revision |
| `pdfStorageUrl` | String | Yes | PDF cloud URL |
| `issuedAt` | DateTime | No | Issue timestamp UTC |

### 4.6 Settlement Model
Merchant bank payout and reconciliation ledger.

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `settlementRef` | String | No | Provider settlement ID |
| `salonId` | String (UUID) | No | Foreign Key to `Salon` |
| `branchId` | String (UUID) | No | Foreign Key to `Branch` |
| `provider` | PaymentProvider | No | Gateway provider |
| `grossAmount` | Int | No | Total collected amount in minor units |
| `feeAmount` | Int | No | Gateway processing fee in minor units |
| `taxAmount` | Int | No | Tax on gateway fee in minor units |
| `netAmount` | Int | No | Net payout to salon bank account in minor units |
| `settledAt` | DateTime | No | Bank settlement timestamp UTC |

---

## 5. Enums & State Machine Design

### 5.1 Enums
- **`PaymentStatus`**: `UNPAID`, `PENDING`, `AUTHORIZED`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`, `CANCELLED`, `EXPIRED`.
- **`RefundStatus`**: `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`.
- **`PaymentMethod`**: `CASH`, `CARD`, `UPI`, `NET_BANKING`, `WALLET`, `BANK_TRANSFER`.
- **`PaymentProvider`**: `CASHFREE`, `RAZORPAY`, `STRIPE`, `MANUAL`, `CUSTOM`.
- **`InvoiceStatus`**: `DRAFT`, `ISSUED`, `PAID`, `VOID`, `CANCELLED`.

### 5.2 Refund State Machine Transition Matrix

```
                      ┌──────────┐
                      │ PENDING  │
                      └────┬─────┘
                           │ Submit to Gateway
                           ▼
                      ┌──────────┐
                      │PROCESSING│
                      └────┬─────┘
           ┌───────────────┼───────────────┐
           │ Success       │ Failure       │ Cancel
           ▼               ▼               ▼
     ┌───────────┐   ┌───────────┐   ┌───────────┐
     │  SUCCESS  │   │  FAILED   │   │ CANCELLED │
     └───────────┘   └───────────┘   └───────────┘
```

#### Allowed Refund Transitions
- `PENDING` $\rightarrow$ `PROCESSING`, `CANCELLED`
- `PROCESSING` $\rightarrow$ `SUCCESS`, `FAILED`
- `FAILED` $\rightarrow$ `PENDING` (Retry attempt)

---

## 6. Payment & Refund Lifecycles & Background Queue Jobs

### Background Queue Jobs (`payments` queue)
1. `payments.webhook_process`: Async verification and processing of provider webhook payloads.
2. `payments.invoice_pdf_generate`: Asynchronous compilation of PDF invoices and upload to Cloudinary/S3.
3. `payments.reconciliation`: Daily cron job comparing pending local orders against gateway API status.
4. `payments.refund_poll`: Polling pending gateway refunds for final status resolution.
5. `payments.settlement_sync`: Synchronizing merchant settlement payouts with salon bank ledgers.

---

## 7. Operational Metrics Architecture

To ensure system reliability, the payment engine exposes metrics via OpenTelemetry/Prometheus:
- `payment_success_rate`: Ratio of successful payments to total attempts.
- `payment_gateway_latency_ms`: Third-party gateway API latency distribution.
- `webhook_processing_failures_total`: Counter for unhandled webhook errors.
- `reconciliation_mismatches_total`: Counter for discrepancies detected during daily reconciliation.
- `refund_failure_rate`: Ratio of failed refunds to total refund requests.

---

## 8. Webhook Architecture

- **Endpoint**: `POST /api/v1/payments/webhooks/:provider`
- **Signature Verification**: Validates HMAC SHA-256 header signature against raw request buffer before parsing JSON.
- **Decoupled Execution**: Webhook receipt returns `200 OK` within 200ms after saving to `PaymentWebhookLog` and queuing `payments.webhook_process`.

---

## 9. REST API Controllers & Endpoints

### 9.1 Public / Webhook Controller (`/api/v1/payments`)
- `POST /webhooks/:provider` — Process incoming provider webhook (`@Public()`)

### 9.2 Customer Controller (`/api/v1/customer/payments`)
- `POST /initiate` — Initiate online payment session for booking
- `GET /:id` — Get payment breakdown and invoice
- `GET /history` — Paginated customer payment history

### 9.3 Owner Controller (`/api/v1/owner/payments`)
- `POST /cash` — Record counter cash payment for walk-in or unpaid booking
- `POST /:id/refund` — Issue partial or full refund
- `GET /` — Search salon branch payments and revenue totals
- `GET /invoices/:id/download` — Download invoice PDF link

### 9.4 Admin Controller (`/api/v1/admin/payments`)
- `GET /` — Global payment search across all salons
- `POST /reconcile` — Reconcile pending gateway orders with provider API

---

## 10. Shared Services Integration & Transaction Governance

### Transaction Execution Order Rule
1. Open DB Transaction (`TransactionService.run`)
2. Write Payment, Transaction, Refund, or Invoice entities
3. Write Audit Log (`AuditService.logInTransaction`)
4. Commit Transaction
5. Invalidate Cache (`CacheService.delete`)
6. Publish Domain Events (`EventBusService.publish`)
7. Enqueue Async Jobs (`QueueService.addJob`)
8. Dispatch User Notifications (`NotificationService.send`)

---

## 11. Final Freeze Declaration

Phase 14.0 Payments & Refunds Architecture is complete and ready for review.
