import { ReviewInvitation, ReviewInvitationStatus } from '@prisma/client';
import { CreateReviewInvitationData } from '../../dto/review.dto';
import { SearchReviewInvitationQueryDto } from '../../dto/search-review.dto';

export interface IReviewInvitationRepository {
  findById(id: string): Promise<ReviewInvitation | null>;
  findByBooking(bookingId: string): Promise<ReviewInvitation | null>;
  findByToken(invitationToken: string): Promise<ReviewInvitation | null>;
  findByCustomer(
    customerId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewInvitation[]; total: number }>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: ReviewInvitation[]; total: number }>;
  findPending(salonId?: string): Promise<ReviewInvitation[]>;
  findExpired(): Promise<ReviewInvitation[]>;
  search(query: SearchReviewInvitationQueryDto): Promise<{ data: ReviewInvitation[]; total: number }>;
  create(data: CreateReviewInvitationData): Promise<ReviewInvitation>;
  updateStatus(id: string, status: ReviewInvitationStatus): Promise<ReviewInvitation>;
  markSent(id: string): Promise<ReviewInvitation>;
  markOpened(id: string): Promise<ReviewInvitation>;
  markCompleted(id: string): Promise<ReviewInvitation>;
  markExpired(id: string): Promise<ReviewInvitation>;
  markFailed(id: string): Promise<ReviewInvitation>;
}
