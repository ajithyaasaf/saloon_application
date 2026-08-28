import {
  adminSalonService,
  adminUserService,
  adminBookingService,
  adminPaymentService,
  adminCatalogService,
  adminInventoryService,
  adminReviewService,
  adminNotificationService,
  adminMediaService,
  adminHealthService,
} from '../services/admin-domain.services';
import { apiClient } from '../services/api.service';

jest.mock('../services/api.service', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  tokenStorage: {
    getAccessToken: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

describe('Admin Domain Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adminSalonService.approveSalon invokes POST /api/v1/admin/salons/:id/approve', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { id: 'salon-1', status: 'APPROVED' } });

    const result = await adminSalonService.approveSalon('salon-1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/salons/salon-1/approve', {});
    expect(result.status).toBe('APPROVED');
  });

  it('adminSalonService.rejectSalon invokes POST /api/v1/admin/salons/:id/reject with reason', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { id: 'salon-1', status: 'REJECTED' } });

    const result = await adminSalonService.rejectSalon('salon-1', 'Incomplete license');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/salons/salon-1/reject', {
      reason: 'Incomplete license',
    });
    expect(result.status).toBe('REJECTED');
  });

  it('adminUserService.suspendUser invokes POST /api/v1/users/:userId/suspend', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { message: 'User suspended' } });

    const result = await adminUserService.suspendUser('user-1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/user-1/suspend', {});
    expect(result.message).toBe('User suspended');
  });

  it('adminBookingService.cleanupExpiredLocks invokes lock cleanup endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { cleanedCount: 5 } });

    const result = await adminBookingService.cleanupExpiredLocks();
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/bookings/cleanup-expired-locks', {});
    expect(result.cleanedCount).toBe(5);
  });

  it('adminPaymentService.retryWebhook invokes webhook retry endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { id: 'webhook-log-1', status: 'REPLAYED' } });

    await adminPaymentService.retryWebhook('webhook-log-1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/payments/webhooks/retry', {
      webhookLogId: 'webhook-log-1',
    });
  });

  it('adminReviewService.hideReview invokes moderation hide endpoint with reason', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { id: 'rev-1', status: 'HIDDEN' } });

    await adminReviewService.hideReview('rev-1', 'Violates policy');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/reviews/moderation/rev-1/hide', {
      reason: 'Violates policy',
    });
  });

  it('adminPaymentService.getStatistics queries payment statistics endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        totalVolume: 50000,
        totalSuccessCount: 10,
        totalFailedCount: 0,
        totalRefundedAmount: 0,
      },
    });

    const res = await adminPaymentService.getStatistics();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/payments/statistics');
    expect(res.totalVolume).toBe(50000);
  });

  it('adminHealthService.getHealth queries health probe endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } });

    const res = await adminHealthService.getHealth();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/health');
    expect(res.status).toBe('ok');
  });
});
