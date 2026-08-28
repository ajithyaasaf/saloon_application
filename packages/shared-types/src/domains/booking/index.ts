import { BookingPaymentType, BookingStatus } from '../../enums/index.js';

export interface BookingServiceItemDto {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  staffId: string;
  staffName: string;
}

export interface BookingDto {
  id: string;
  bookingNumber: string;
  salonId: string;
  salonName?: string;
  branchId: string;
  branchName?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  status: BookingStatus;
  paymentType: BookingPaymentType;
  paymentStatus?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  bookingDate: string; // "2026-08-25"
  startTime: string; // "10:00"
  endTime: string; // "11:30"
  services: BookingServiceItemDto[];
  notes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTimeSlotDto {
  startTime: string; // "10:00"
  endTime: string; // "11:00"
  staffId: string;
  staffName: string;
  isAvailable: boolean;
}

export interface QuerySlotsRequestDto {
  branchId: string;
  serviceIds: string[];
  date: string; // "YYYY-MM-DD"
  staffId?: string; // Optional preferred staff
}

export interface CreateBookingRequestDto {
  branchId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "14:00"
  services: {
    serviceId: string;
    staffId?: string; // If omitted, auto-assigns any available staff
  }[];
  paymentType: BookingPaymentType;
  couponCode?: string;
  notes?: string;
}

export interface RescheduleBookingRequestDto {
  date: string;
  startTime: string;
  services?: {
    serviceId: string;
    staffId?: string;
  }[];
}

export interface CancelBookingRequestDto {
  reason: string;
}

export interface UpdateBookingStatusRequestDto {
  status: BookingStatus;
  notes?: string;
}

export type BookingSlotDto = AvailableTimeSlotDto;
export type BookingSummaryDto = BookingDto;
export type RescheduleBookingDto = RescheduleBookingRequestDto;
