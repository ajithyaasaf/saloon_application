import { bookingService, catalogService, salonService, staffService } from '../services/salon-domain.services.js';
import { apiClient } from '../services/api.service.js';
import { BookingStatus, Gender, SalonStatus, UserRole } from '@saloon/shared-types';

jest.mock('../services/api.service.js', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  tokenStorage: {
    getAccessToken: jest.fn(),
    setAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setRefreshToken: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

describe('Salon Dashboard Domain Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('salonService.getSalon should call GET /api/v1/salons/:id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { id: 's_1', name: 'Luxe Salon', status: SalonStatus.APPROVED },
    });

    const result = await salonService.getSalon('s_1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/salons/s_1');
    expect(result.name).toBe('Luxe Salon');
  });

  it('bookingService.updateBookingStatus should call PATCH /api/v1/booking/:id/status', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { id: 'b_1', status: BookingStatus.IN_PROGRESS },
    });

    const result = await bookingService.updateBookingStatus('b_1', BookingStatus.IN_PROGRESS, 'Started service');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/booking/b_1/status', {
      status: BookingStatus.IN_PROGRESS,
      notes: 'Started service',
    });
    expect(result.status).toBe(BookingStatus.IN_PROGRESS);
  });

  it('catalogService.createService should call POST /api/v1/service-catalog/services', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { id: 'srv_1', name: 'Hair Spa', basePrice: 999 },
    });

    const result = await catalogService.createService({
      categoryId: 'cat_1',
      name: 'Hair Spa',
      basePrice: 999,
      durationMinutes: 60,
      targetGender: Gender.FEMALE,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/owner/services', expect.objectContaining({ name: 'Hair Spa' }));
    expect(result.id).toBe('srv_1');
  });
});
