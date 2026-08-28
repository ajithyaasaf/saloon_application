import { API_ROUTES } from '@saloon/config';
import { apiClient } from '../services/api.service';
import {
  catalogService,
  customerBookingService,
  customerAccountService,
  salonDiscoveryService,
} from '../services/customer-domain.services';

describe('Customer Mobile Domain Services', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch salon discovery listings using public route', async () => {
    const mockSalons = [
      { id: 'salon-1', name: 'Luxe Salon Indiranagar', isVerified: true },
    ];
    const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: mockSalons as any,
    });

    const result = await salonDiscoveryService.getSalons();
    expect(spy).toHaveBeenCalledWith(API_ROUTES.SALONS.LIST, { skipAuth: true });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Luxe Salon Indiranagar');
  });

  it('should fetch service categories', async () => {
    const mockCategories = [{ id: 'cat-1', name: 'Hair Treatments' }];
    const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: mockCategories as any,
    });

    const result = await catalogService.getCategories();
    expect(spy).toHaveBeenCalledWith(API_ROUTES.SERVICE_CATALOG.CATEGORIES.LIST, {
      skipAuth: true,
    });
    expect(result[0].name).toBe('Hair Treatments');
  });

  it('should acquire temporary reservation lock', async () => {
    const mockLock = { lockKey: 'lock-12345', expiresAt: '2026-08-19T10:00:00Z' };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      statusCode: 201,
      timestamp: new Date().toISOString(),
      data: mockLock as any,
    });

    const lock = await customerBookingService.acquireReservationLock({
      branchId: 'b-1',
      slotDate: '2026-08-25',
      startTime: '10:00',
      endTime: '10:45',
    });

    expect(spy).toHaveBeenCalledWith('/api/v1/customer/bookings/reservation', {
      branchId: 'b-1',
      slotDate: '2026-08-25',
      startTime: '10:00',
      endTime: '10:45',
    });
    expect(lock.lockKey).toBe('lock-12345');
  });

  it('should fetch customer wallet ledger', async () => {
    const mockLedger = [
      { id: 'w-1', amount: 150, type: 'CREDIT' as const, description: 'Welcome bonus', customerId: 'c-1', balanceAfter: 150, createdAt: new Date().toISOString() },
    ];
    const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: mockLedger,
    });

    const result = await customerAccountService.getWalletLedger();
    expect(spy).toHaveBeenCalledWith('/api/v1/customer/customers/wallet');
    expect(result[0].amount).toBe(150);
  });
});
