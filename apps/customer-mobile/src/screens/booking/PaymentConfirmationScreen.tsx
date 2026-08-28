import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BookingPaymentType } from '@saloon/shared-types';
import { formatINR, format12HourTime } from '@saloon/shared-utils';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { useToast } from '../../context/ToastContext';
import { customerBookingService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface PaymentConfirmationScreenProps {
  onDone: () => void;
  onViewBookings: () => void;
}

export const PaymentConfirmationScreen: React.FC<PaymentConfirmationScreenProps> = ({
  onDone,
  onViewBookings,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { draft, getPricingSummary, resetDraft } = useBookingFlow();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const pricing = getPricingSummary();

  const handlePayAndConfirm = async () => {
    setLoading(true);
    try {
      const branchId = draft.branch?.id || 'default-branch';
      const serviceIds = draft.services.map((s) => s.id);

      const booking = await customerBookingService.createBooking({
        branchId,
        date: draft.selectedDate,
        startTime: draft.selectedSlot?.startTime || '10:00',
        services: draft.services.map((s) => ({ serviceId: s.id })),
        paymentType: BookingPaymentType.ONLINE,
        couponCode: draft.appliedCoupon ? draft.couponCode : undefined,
      });

      setConfirmedBookingId(booking.id);
      showToast('Appointment Confirmed!', 'success');
    } catch (err: any) {
      console.error('Booking failed:', err);
      showToast(err?.message || 'Payment initiation failed. Please retry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (confirmedBookingId) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <Icon name="check-circle" size={48} color="#10B981" />
          </View>
          <Text style={[typography.display, styles.successTitle, { color: colors.textPrimary }]}>
            Booking Confirmed!
          </Text>
          <Text style={[typography.body, styles.successSubtitle, { color: colors.textSecondary }]}>
            Your appointment has been reserved with{' '}
            <Text style={{ fontWeight: '700', color: colors.primary }}>
              {draft.salon?.name || 'Saloon'}
            </Text>
          </Text>

          <AppCard style={styles.confirmationCard} variant="elevated">
            <View style={styles.confRow}>
              <Text style={[styles.confLabel, { color: colors.textMuted }]}>Booking Ref</Text>
              <Text style={[styles.confVal, { color: colors.textPrimary }]}>
                #{confirmedBookingId.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <View style={styles.confRow}>
              <Text style={[styles.confLabel, { color: colors.textMuted }]}>Date & Time</Text>
              <Text style={[styles.confVal, { color: colors.textPrimary }]}>
                {draft.selectedDate} at {format12HourTime(draft.selectedSlot?.startTime)}
              </Text>
            </View>
            <View style={styles.confRow}>
              <Text style={[styles.confLabel, { color: colors.textMuted }]}>Amount Paid</Text>
              <Text style={[styles.confVal, { color: '#10B981', fontWeight: '700' }]}>
                {formatINR(pricing.finalPayable)}
              </Text>
            </View>
            <View style={styles.confRow}>
              <Text style={[styles.confLabel, { color: colors.textMuted }]}>Status</Text>
              <AppBadge variant="success">CONFIRMED</AppBadge>
            </View>
          </AppCard>
        </View>

        <View style={styles.successButtons}>
          <AppButton
            title="View in My Bookings"
            onPress={() => {
              resetDraft();
              onViewBookings();
            }}
            size="lg"
          />
          <AppButton
            title="Back to Home"
            variant="outline"
            onPress={() => {
              resetDraft();
              onDone();
            }}
            size="md"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <Text style={[typography.heading1, { color: colors.textPrimary, marginBottom: 4 }]}>
          Payment Method
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 20 }]}>
          Secure UPI, Debit/Credit Card, and Netbanking via Razorpay
        </Text>

        <AppCard style={styles.methodCard} variant="elevated">
          <View style={styles.methodHeader}>
            <View style={[styles.methodIconCircle, { backgroundColor: '#F4F0FF' }]}>
              <Icon name="credit-card" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Razorpay UPI & Cards
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Google Pay, PhonePe, Cards, Netbanking
              </Text>
            </View>
            <AppBadge variant="primary">Active</AppBadge>
          </View>
        </AppCard>

        <AppCard style={styles.securityCard}>
          <View style={styles.securityRow}>
            <Icon name="lock" size={16} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              256-bit encrypted checkout. Your payment details are protected under RBI compliance.
            </Text>
          </View>
        </AppCard>
      </View>

      <View style={[styles.bottomSection, { backgroundColor: '#FFFFFF', borderTopColor: '#E8EAF3' }]}>
        <View style={styles.amountRow}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Total Payable</Text>
          <Text style={[typography.heading1, { color: colors.primary, fontWeight: '800' }]}>
            {formatINR(pricing.finalPayable)}
          </Text>
        </View>

        <AppButton
          title="Pay & Confirm Booking"
          loading={loading}
          onPress={handlePayAndConfirm}
          size="lg"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    padding: 20,
    paddingTop: 54,
  },
  methodCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    marginBottom: 14,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomSection: {
    padding: 20,
    borderTopWidth: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  successContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  successContent: {
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmationCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    gap: 12,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confLabel: {
    fontSize: 13,
  },
  confVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  successButtons: {
    gap: 12,
    marginBottom: 20,
  },
});
