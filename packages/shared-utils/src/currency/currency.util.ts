/**
 * Currency, Price, and Indian Tax (GST) calculation utilities.
 */

export interface FormatINROptions {
  showSymbol?: boolean;
  showPaise?: boolean;
}

export interface GstBreakdown {
  subtotal: number;
  gstRatePercent: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

/**
 * Format a number into standard Indian Rupee notation (e.g. ₹1,23,456.00 or ₹1,23,456)
 */
export function formatINR(amount: number, options: FormatINROptions = {}): string {
  const { showSymbol = true, showPaise = false } = options;
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  }).format(absAmount);

  const prefix = isNegative ? '-' : '';
  const symbol = showSymbol ? '₹' : '';

  return `${prefix}${symbol}${formatted}`;
}

/**
 * Convert standard Rupee amount to Paise integer (e.g. ₹150.50 -> 15050 paise for Razorpay).
 */
export function rupeesToPaise(rupees: number): number {
  if (isNaN(rupees) || rupees <= 0) return 0;
  return Math.round(rupees * 100);
}

/**
 * Convert Paise integer to Rupee amount (e.g. 15050 paise -> ₹150.50).
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise) || paise <= 0) return 0;
  return Math.round(paise) / 100;
}

/**
 * Calculate standard GST (CGST + SGST or IGST) for an amount. Default GST is 18%.
 */
export function calculateGST(subtotal: number, gstRatePercent: number = 18): GstBreakdown {
  const safeSubtotal = Math.max(0, isNaN(subtotal) ? 0 : subtotal);
  const safeRate = Math.max(0, isNaN(gstRatePercent) ? 0 : gstRatePercent);

  const rawGst = (safeSubtotal * safeRate) / 100;
  const gstAmount = Math.round(rawGst * 100) / 100;
  const halfGst = Math.round((gstAmount / 2) * 100) / 100;

  return {
    subtotal: safeSubtotal,
    gstRatePercent: safeRate,
    gstAmount,
    cgstAmount: halfGst,
    sgstAmount: gstAmount - halfGst, // Ensure exact penny match
    totalAmount: Math.round((safeSubtotal + gstAmount) * 100) / 100,
  };
}

/**
 * Calculate applicable discount given discount type, value, and optional maximum cap.
 */
export function calculateDiscount(
  amount: number,
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SERVICE' | 'CASHBACK',
  discountValue: number,
  maxDiscountAmount?: number | null,
): number {
  if (amount <= 0) return 0;
  if (discountType !== 'FREE_SERVICE' && discountValue <= 0) return 0;

  let discount = 0;
  if (discountType === 'PERCENTAGE') {
    discount = (amount * discountValue) / 100;
    if (maxDiscountAmount && maxDiscountAmount > 0) {
      discount = Math.min(discount, maxDiscountAmount);
    }
  } else if (discountType === 'FIXED_AMOUNT') {
    discount = Math.min(amount, discountValue);
  } else if (discountType === 'FREE_SERVICE') {
    discount = amount;
  } else if (discountType === 'CASHBACK') {
    discount = 0; // Cashback does not reduce invoice total at checkout
  }

  return Math.round(Math.min(amount, Math.max(0, discount)) * 100) / 100;
}
