import { calculateGST, formatINR } from '@saloon/shared-utils';

describe('Booking Flow Calculations & Price Breakdown', () => {
  it('should accurately compute item subtotal, GST (18%) and final payable amount', () => {
    const services = [
      { id: 'srv-1', name: 'Haircut & Styling', basePrice: 600, durationMinutes: 45 },
      { id: 'srv-2', name: 'Beard Trim & Shape', basePrice: 400, durationMinutes: 25 },
    ];

    const subtotal = services.reduce((acc, s) => acc + s.basePrice, 0);
    expect(subtotal).toBe(1000);

    const gst = calculateGST(subtotal, 18);
    expect(gst.subtotal).toBe(1000);
    expect(gst.gstAmount).toBe(180);
    expect(gst.totalAmount).toBe(1180);
  });

  it('should correctly apply promo coupon discount and wallet debits', () => {
    const totalWithGst = 1180;
    const discountAmount = 250; // DIWALI25
    const walletBalance = 100;

    const afterDiscount = Math.max(0, totalWithGst - discountAmount);
    expect(afterDiscount).toBe(930);

    const afterWallet = Math.max(0, afterDiscount - walletBalance);
    expect(afterWallet).toBe(830);
    expect(formatINR(afterWallet)).toBe('₹830');
  });
});
