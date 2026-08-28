# PHASE 17 — CUSTOMER REVIEWS, RATINGS, FEEDBACK & REPUTATION MANAGEMENT ARCHITECTURE BLUEPRINT

**Status**: FROZEN ARCHITECTURE SPECIFICATION  
**Module**: Phase 17 — Customer Reviews, Ratings, Feedback & Reputation Management  
**Scope**: Multi-Tenant Salon ERP — Verified Booking Reviews, Multi-Criteria Ratings, Staff/Service Breakdown, Photo Attachments, Owner Replies, Moderation & Disputes, Automated Reputation Aggregation & Post-Appointment Invitations  
**Target Platform**: `@saloon/api` (NestJS / Prisma / PostgreSQL / Redis / BullMQ)

---

## 1. Purpose
The **Customer Reviews, Ratings, Feedback & Reputation Management** module provides an enterprise-grade social proof, service quality auditing, and reputation management platform for salons, branches, stylists, and individual treatments. In modern salon ecosystems (e.g., Fresha, Booksy, Zenoti), authentic verified client feedback drives consumer discovery, establishes stylist credibility, provides actionable operational metrics, and powers algorithmic ranking.

---

## 2. Scope
- **Verified Booking Reviews**: Every customer review is strictly linked to a completed `Booking` (1:1 verified purchase anchor).
- **Multi-Dimensional Matrix Ratings**: Captures overall rating and granular dimensional scores (cleanliness, hospitality/stylist skill, ambience, value for money).
- **Itemized Service & Stylist Breakdown**: Supports itemized ratings (`ReviewItemRating`) for each service and stylist within multi-service appointments.
- **Media & Photo Transformation Attachments**: High-resolution before/after client photo uploads linked to reviews.
- **Salon Public Responses**: Formal audited owner/manager replies to customer feedback.
- **Social Proof & Helpful Voting**: Public community upvoting with anti-abuse idempotency.
- **Moderation & Owner Disputes**: Multi-tier moderation pipeline for flagging abuse with Super Admin arbitration.
- **Real-Time Rolling Reputation Aggregates**: High-performance denormalized rating summaries maintaining real-time Bayesian averages, star distributions, and Net Promoter Scores (NPS) across Salons, Branches, Staff, and Services.
- **Automated Post-Appointment Review Invitations**: Lifecycle tracking for push/SMS/WhatsApp review prompts triggered upon appointment completion.

---

## 3. Bounded Context
The Reviews & Feedback domain is an independent bounded context interacting with:
- **Booking Engine (Phase 13)**: Upstream provider of completed booking verification.
- **Customer CRM (Phase 15)**: Upstream provider of customer profiles and loyalty rewards for reviews.
- **Staff Management (Phase 12)**: Upstream entity context for stylist ratings and leaderboards.
- **Service Catalog (Phase 11)**: Upstream entity context for service treatment ratings.
- **Salon Management (Phase 10)**: Upstream entity context for salon and branch tenant hierarchy.
- **Media Management (Phase 9)**: Upstream provider for photo asset storage.

---

## 4. Responsibilities
- Validate and enforce verified customer booking review eligibility.
- Ingest, store, and version review comments, dimensional scores, and item ratings.
- Enforce unique review-per-booking constraints.
- Manage the review publication and moderation lifecycle.
- Facilitate salon owner reply submissions and revisions.
- Calculate and maintain denormalized reputation summary records for Salons, Branches, Staff, and Services.
- Process user helpfulness votes idempotently.
- Handle review abuse flagging and formal owner dispute arbitrations.
- Issue and track automated post-appointment review invitation tokens.

---

## 5. Non-Responsibilities
- Does NOT handle booking creation, scheduling, or cancellations (owned by `Booking Engine`).
- Does NOT handle customer profile management or loyalty point ledgers (owned by `Customer CRM`).
- Does NOT handle staff payroll, commissions, or employment records (owned by `Staff Management`).
- Does NOT manage media binary uploading or CDN delivery directly (owned by `Media Service`).
- Does NOT manage transactional email/SMS transport delivery directly (owned by `SharedNotificationModule`).

---

## 6. Database Models

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REVIEWS DOMAIN BOUNDED CONTEXT                                 │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

 [AGGREGATE 1: Review & Client Feedback]
 ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
 │        Review        │ ──1:N──>│   ReviewItemRating   │ ──N:1──>│     Staff / Service  │
 │  (Booking Anchor)    │         └──────────────────────┘         └──────────────────────┘
 └──────────┬───────────┘
            │
            ├──1:N──> [ ReviewMediaAttachment ] ──N:1──> [ Media (Central Asset) ]
            ├──1:1──> [ ReviewReply ] (Salon Owner Official Response)
            └──1:N──> [ ReviewHelpfulVote ] (User Upvote / Helpfulness)

 [AGGREGATE 2: Review Moderation & Dispute Arbitration]
 ┌──────────────────────┐         ┌──────────────────────┐
 │      ReviewFlag      │         │    ReviewDispute     │
 │ (Consumer Reporting) │         │ (Salon Owner Appeal) │
 └──────────────────────┘         └──────────────────────┘

 [AGGREGATE 3: Denormalized Reputation Summaries]
 ┌──────────────────────┐         ┌──────────────────────┐
 │  SalonRatingSummary  │         │ BranchRatingSummary  │
 └──────────────────────┘         └──────────────────────┘
 ┌──────────────────────┐         ┌──────────────────────┐
 │  StaffRatingSummary  │         │ ServiceRatingSummary │
 └──────────────────────┘         └──────────────────────┘

 [AGGREGATE 4: Review Prompt Lifecycle]
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   ReviewInvitation                                     │
 │                          (Triggered via booking.completed)                             │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **`Review`** (`reviews`): Root aggregate storing verified review records.
2. **`ReviewItemRating`** (`review_item_ratings`): Itemized service and staff stylist ratings.
3. **`ReviewMediaAttachment`** (`review_media_attachments`): Linked photo proof and transformation images.
4. **`ReviewReply`** (`review_replies`): Official salon response to client reviews.
5. **`ReviewHelpfulVote`** (`review_helpful_votes`): User social proof helpfulness votes.
6. **`ReviewFlag`** (`review_flags`): Consumer abuse reporting tickets.
7. **`ReviewDispute`** (`review_disputes`): Formal salon owner dispute appeals.
8. **`SalonRatingSummary`** (`salon_rating_summaries`): Real-time rating and NPS aggregates for Salons.
9. **`BranchRatingSummary`** (`branch_rating_summaries`): Real-time rating and NPS aggregates for Branches.
10. **`StaffRatingSummary`** (`staff_rating_summaries`): Real-time rating aggregates for Stylists.
11. **`ServiceRatingSummary`** (`service_rating_summaries`): Real-time rating aggregates for Services.
12. **`ReviewInvitation`** (`review_invitations`): Post-appointment review prompt lifecycle tracking.

---

## 7. Enums
- **`ReviewStatus`**: `PENDING_APPROVAL`, `PUBLISHED`, `FLAGGED`, `UNDER_REVIEW`, `HIDDEN`, `REJECTED`, `ARCHIVED`
- **`ReviewFlagReason`**: `INAPPROPRIATE_CONTENT`, `SPAM_OR_FAKE`, `OFF_TOPIC`, `HARASSMENT_OR_HATE_SPEECH`, `CONFLICT_OF_INTEREST`, `DEFAMATION`, `OTHER`
- **`ReviewFlagStatus`**: `PENDING`, `UNDER_REVIEW`, `UPHELD`, `DISMISSED`
- **`ReviewDisputeStatus`**: `SUBMITTED`, `IN_REVIEW`, `RESOLVED_REMOVED`, `RESOLVED_EDITED`, `REJECTED_MAINTAINED`
- **`ReviewInvitationStatus`**: `PENDING`, `SENT`, `OPENED`, `COMPLETED`, `EXPIRED`, `FAILED`

---

## 8. Relationships
- **`Review`**: Belongs to `Salon` (1:N), `Branch` (1:N), `User` (Customer, 1:N), `Booking` (1:1 optional/verified), and legacy `Appointment` (1:1 optional).
- **`ReviewItemRating`**: Belongs to `Review` (Cascade), `Service` (Restrict), `Staff` (Set Null), and `BookingItem` (Set Null).
- **`ReviewMediaAttachment`**: Belongs to `Review` (Cascade) and `Media` (Restrict).
- **`ReviewReply`**: Belongs to `Review` (1:1 Cascade), `Salon` (Restrict), and `User` (Responder, Restrict).
- **`ReviewHelpfulVote`**: Belongs to `Review` (Cascade) and `User` (Cascade).
- **`ReviewFlag`**: Belongs to `Review` (Cascade), `User` (Reporter, Restrict), and `User` (Resolver, Set Null).
- **`ReviewDispute`**: Belongs to `Review` (1:1 Restrict), `Salon` (Restrict), `User` (Submitter, Restrict), and `User` (Admin Reviewer, Set Null).
- **`SalonRatingSummary`**: 1:1 on `Salon` (Cascade).
- **`BranchRatingSummary`**: 1:1 on `Branch` (Cascade).
- **`StaffRatingSummary`**: 1:1 on `Staff` (Cascade) and `Salon` (Restrict).
- **`ServiceRatingSummary`**: 1:1 on `Service` (Cascade) and `Salon` (Restrict).
- **`ReviewInvitation`**: Belongs to `Booking` (1:1 Cascade), `Salon` (Restrict), `Branch` (Restrict), and `User` (Customer, Restrict).

---

## 9. Indexes
- `idx_reviews_salon_status` on `reviews(salon_id, status)`
- `idx_reviews_branch_status` on `reviews(branch_id, status)`
- `idx_reviews_customer` on `reviews(customer_id)`
- `idx_reviews_overall_rating` on `reviews(overall_rating)`
- `idx_reviews_status_published_at` on `reviews(status, published_at DESC)`
- `idx_reviews_deleted_at` on `reviews(deleted_at)`
- `idx_review_item_ratings_review` on `review_item_ratings(review_id)`
- `idx_review_item_ratings_service` on `review_item_ratings(service_id)`
- `idx_review_item_ratings_staff` on `review_item_ratings(staff_id)`
- `idx_review_media_attachments_review` on `review_media_attachments(review_id)`
- `idx_review_replies_salon` on `review_replies(salon_id)`
- `idx_review_flags_review` on `review_flags(review_id)`
- `idx_review_flags_status` on `review_flags(status)`
- `idx_review_disputes_salon_status` on `review_disputes(salon_id, status)`
- `idx_review_invitations_salon_status` on `review_invitations(salon_id, status)`
- `idx_review_invitations_customer` on `review_invitations(customer_id)`

---

## 10. Constraints
- `uq_reviews_booking`: Unique constraint ensuring 1 review per booking.
- `uq_reviews_appointment`: Unique constraint ensuring 1 review per legacy appointment.
- `uq_review_replies_review`: 1 reply per review.
- `uq_review_helpful_votes_user`: 1 vote per user per review.
- `uq_review_disputes_code`: Unique dispute tracking code (`DSP-YYYYMM-XXXX`).
- `uq_review_disputes_review`: 1 active dispute per review.
- `uq_salon_rating_summaries_salon`: 1 summary record per salon.
- `uq_branch_rating_summaries_branch`: 1 summary record per branch.
- `uq_staff_rating_summaries_staff`: 1 summary record per staff stylist.
- `uq_service_rating_summaries_service`: 1 summary record per service.
- `uq_review_invitations_booking`: 1 review invitation per booking.
- `uq_review_invitations_token`: Unique secure token string.
- Database Check Constraint: `CHECK (overall_rating >= 1 AND overall_rating <= 5)`.

---

## 11. Domain Entities
Pure TypeScript framework-agnostic models:
1. `ReviewEntity`: Manages rating evaluation, published state transitions, masking for anonymity, and edit grace periods.
2. `ReviewItemRatingEntity`: Validates service and stylist score bounds.
3. `ReviewReplyEntity`: Enforces official salon owner response policies.
4. `ReviewHelpfulVoteEntity`: Enforces idempotent user voting logic.
5. `ReviewFlagEntity`: Tracks abuse reporting workflows and resolution states.
6. `ReviewDisputeEntity`: Manages owner dispute arbitrations.
7. `ReputationSummaryEntity`: Calculates Bayesian averages, star distributions, and Net Promoter Scores.
8. `ReviewInvitationEntity`: Controls invitation token issuance, expiry, and redemption.

---

## 12. Domain Services
1. **`ReviewService`**: Core submission, customer edit, publication, masking, and deletion workflows.
2. **`ReviewReplyService`**: Salon owner official reply creation, modification, and deletion.
3. **`ReviewVoteService`**: Idempotent helpfulness upvoting and vote cancellation.
4. **`ReviewModerationService`**: Abuse flag submission, automated word filter checks, and resolution.
5. **`ReviewDisputeService`**: Formal owner dispute filing and Super Admin arbitration.
6. **`ReputationSummaryService`**: Real-time asynchronous computation of rolling star averages and NPS.
7. **`ReviewInvitationService`**: Post-booking automated invitation dispatch and token validation.

---

## 13. Repository Interfaces
1. `ReviewRepositoryInterface`
2. `ReviewItemRatingRepositoryInterface`
3. `ReviewMediaAttachmentRepositoryInterface`
4. `ReviewReplyRepositoryInterface`
5. `ReviewHelpfulVoteRepositoryInterface`
6. `ReviewFlagRepositoryInterface`
7. `ReviewDisputeRepositoryInterface`
8. `SalonRatingSummaryRepositoryInterface`
9. `BranchRatingSummaryRepositoryInterface`
10. `StaffRatingSummaryRepositoryInterface`
11. `ServiceRatingSummaryRepositoryInterface`
12. `ReviewInvitationRepositoryInterface`

---

## 14. Domain Events
All events strongly typed and versioned:
1. `review.submitted.v1`: Emitted when a customer submits a new review.
2. `review.published.v1`: Emitted when a review becomes publicly visible.
3. `review.updated.v1`: Emitted when a customer edits an existing review.
4. `review.replied.v1`: Emitted when a salon owner posts an official response.
5. `review.flagged.v1`: Emitted when a review is flagged for moderation.
6. `review.moderated.v1`: Emitted when an admin resolves a flag or dispute.
7. `review.helpful_voted.v1`: Emitted when a review receives a helpfulness vote.
8. `reputation.recalculated.v1`: Emitted when a summary aggregate is refreshed.
9. `review_invitation.sent.v1`: Emitted when an invitation prompt is dispatched.

---

## 15. API Surface

### A. Public Routes (`/api/v1/public/reviews`)
- `GET /public/reviews/salon/:salonId`: Paginated published reviews for a salon.
- `GET /public/reviews/branch/:branchId`: Paginated published reviews for a branch.
- `GET /public/reviews/service/:serviceId`: Paginated reviews for a specific service.
- `GET /public/reviews/staff/:staffId`: Paginated reviews for a specific stylist.
- `GET /public/reviews/salon/:salonId/summary`: Aggregated rating summary and star distribution.
- `GET /public/reviews/branch/:branchId/summary`: Branch rating summary and NPS.
- `GET /public/reviews/staff/:staffId/summary`: Stylist rating summary.
- `GET /public/reviews/service/:serviceId/summary`: Service rating summary.

### B. Customer Routes (`/api/v1/customer/reviews`)
- `POST /customer/reviews`: Submit a verified review for a completed booking.
- `PUT /customer/reviews/:id`: Edit own review within grace period.
- `DELETE /customer/reviews/:id`: Soft-delete own review.
- `POST /customer/reviews/:id/vote`: Upvote a review as helpful.
- `DELETE /customer/reviews/:id/vote`: Remove helpfulness vote.
- `POST /customer/reviews/:id/flag`: Flag an abusive or inappropriate review.
- `GET /customer/reviews/invitations/:token`: Validate single-use review invite token.

### C. Salon Owner Routes (`/api/v1/owner/reviews`)
- `GET /owner/reviews`: List all branch reviews with sentiment and rating filters.
- `POST /owner/reviews/:id/reply`: Post official salon response.
- `PUT /owner/reviews/:id/reply`: Update official salon response.
- `DELETE /owner/reviews/:id/reply`: Remove official salon response.
- `POST /owner/reviews/:id/dispute`: File formal dispute appeal.
- `GET /owner/reviews/analytics/reputation`: Detailed salon/branch/staff reputation metrics.

### D. Super Admin Routes (`/api/v1/admin/reviews`)
- `GET /admin/reviews/moderation-queue`: List flagged reviews and open disputes.
- `PUT /admin/reviews/flags/:flagId/resolve`: Arbitrate review flag (upheld/dismissed).
- `PUT /admin/reviews/disputes/:disputeId/resolve`: Arbitrate owner dispute.
- `POST /admin/reviews/recalculate-summaries`: Force-recalculate platform rating summaries.

---

## 16. RBAC & Permissions
- **`PUBLIC`**: Read published reviews and summary ratings. Zero access to unpublished, hidden, or internal dispute records.
- **`CUSTOMER`**: Can submit reviews only for bookings matching `customerId = caller.id` with `BookingStatus.COMPLETED`.
- **`SALON_OWNER`**: Can view all reviews in owned salon, reply to reviews, and dispute violating reviews.
- **`SUPER_ADMIN`**: Can moderate all reviews, arbitrate disputes, hide/redact content, and trigger reputation recalculations.

---

## 17. Tenant Isolation
- Every review query by salon owners is scoped strictly by `WHERE salon_id = :salonId`.
- Branch managers and staff see only reviews belonging to their assigned branch.
- Cross-tenant IDOR attacks are blocked at the service layer by validating tenant ownership before executing mutations.

---

## 18. Transactions & Pipeline
All state-mutating workflows strictly follow the transaction pipeline:
```text
1. DATABASE TRANSACTION (TransactionService.run)
   ├── Invariant Validation (Booking completed, single review check, rating bounds)
   ├── Aggregate State Mutations
   └── In-Transaction Audit Logging (AuditService.logInTransaction)
2. DATABASE COMMIT
3. CACHE INVALIDATION (CacheService.delete)
4. DOMAIN EVENT DISPATCH (EventBusService.publish)
5. QUEUE JOBS (BullMQ Async Aggregations & Notifications)
```

---

## 19. Cache Strategy
- **Namespace**: `reviews:*`
- **Keys**:
  - `reviews:salon:<salonId>:summary` (TTL: 1 hour)
  - `reviews:branch:<branchId>:summary` (TTL: 1 hour)
  - `reviews:staff:<staffId>:summary` (TTL: 1 hour)
  - `reviews:service:<serviceId>:summary` (TTL: 1 hour)
  - `reviews:booking:<bookingId>` (TTL: 24 hours)
- **Invalidation**: Targeted post-commit invalidation upon review submission, reply, moderation state change, or recalculation.

---

## 20. Performance Strategy
- **Denormalized Summaries**: Heavy aggregation queries (averages, count distributions, NPS) are precomputed into dedicated summary tables (`salon_rating_summaries`, etc.) and cached in Redis.
- **Composite Indexing**: Standard listing queries query `(salon_id, status)` and `(status, published_at DESC)` using composite B-tree indexes.
- **Pagination**: Mandatory cursor/offset pagination on all list endpoints (default limit 20, max 50).

---

## 21. Integration Points
- **Booking Module (Phase 13)**: Subscribes to `booking.completed.v1` to trigger automated `ReviewInvitation` creation.
- **Customer Module (Phase 15)**: Emits `review.published.v1` which the Loyalty system can consume to award review bonus points.
- **Notification Module (Phase 9)**: Dispatches automated review invitation SMS/WhatsApp/Push messages.
- **Media Module (Phase 9)**: Associates customer before/after transformation pictures with reviews.

---

## 22. Error Handling
- `NotFoundException` (404): Review, booking, or dispute not found.
- `ConflictException` (409): Duplicate review for the same booking, duplicate helpful vote, duplicate dispute.
- `BadRequestException` (400): Booking not yet completed, invalid rating range ($<1$ or $>5$), expired edit window.
- `ForbiddenException` (403): Cross-tenant access attempt, replying to another salon's review.

---

## 23. Testing Strategy
- **Repository Unit Tests**: Test CRUD, composite queries, unique constraints, and relation joins.
- **Domain Service Tests**: Test business rules, transaction boundaries, audit logs, post-commit event publishing, and cache invalidation.
- **Controller Unit Tests**: Test route mapping, DTO validation, and response serialization.
- **Integration Audit Tests**: Test complete booking $\rightarrow$ review $\rightarrow$ reply $\rightarrow$ summary recalculation workflows.

---

## 24. Future Extensions
- **AI Sentiment Analysis**: Automated positive/negative sentiment tagging and keyword extraction from review text.
- **Social Media Auto-Sharing**: Option for salon owners to auto-post 5-star reviews to Instagram and Google My Business.
- **Video Reviews**: Support for video testimonials with automatic transcribing.

---

## 25. Architecture Rules
1. **Verified Purchase Invariant**: A review must NEVER be created without a valid, completed `Booking` record.
2. **Zero Direct Prisma in Controllers**: Controllers must strictly delegate to Domain Services.
3. **Double-Posting Protection**: The `uq_reviews_booking` constraint must never be bypassed.
4. **Post-Commit Side Effects**: Domain events and Redis cache invalidations must NEVER execute before transaction commit.
5. **Masking of Anonymous Reviews**: If `isAnonymous` is `true`, customer personal identifiable information must be masked on public endpoints.
