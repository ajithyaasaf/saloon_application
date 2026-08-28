import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDuration, formatINR, format12HourTime } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppInput } from '../../components/ui/AppInput';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

export interface OrderSummaryScreenProps {
  onBack: () => void;
  onProceedToPayment: () => void;
}

export const OrderSummaryScreen: React.FC<OrderSummaryScreenProps> = ({
  onBack,
  onProceedToPayment,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const {
    draft,
    getPricingSummary,
    applyCoupon,
    removeCoupon,
    toggleWalletUsage,
  } = useBookingFlow();
  const { showToast } = useToast();
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const pricing = getPricingSummary();

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setCouponLoading(true);
    const res = await applyCoupon(couponInput);
    setCouponLoading(false);
    if (res.success) {
      showToast(res.message, 'success');
      setCouponInput('');
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Booking Summary & Checkout" showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Salon & Branch Card */}
        <AppCard style={styles.sectionCard}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginBottom: 6 }]}>
            SALON & LOCATION
          </Text>
          <Text style={[typography.heading2, { color: colors.textPrimary, marginBottom: 8 }]}>
            {draft.salon?.name || 'Luxe Unisex Salon'}
          </Text>
          
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={14} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {draft.branch?.name || 'Indiranagar Main Branch'}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Icon name="calendar" size={14} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {draft.selectedDate} at {format12HourTime(draft.selectedSlot?.startTime)}
            </Text>
          </View>
        </AppCard>

        {/* Selected Services Breakdown */}
        <AppCard style={styles.sectionCard}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginBottom: 10 }]}>
            SELECTED TREATMENTS
          </Text>
          {draft.services.map((srv) => (
            <View key={srv.id} style={[styles.serviceRow, { borderBottomColor: '#E8EAF3' }]}>
              <View style={styles.serviceTextCol}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{srv.name}</Text>
                <View style={styles.metaRow}>
                  <Icon name="clock" size={12} color={colors.textMuted} />
                  <Text style={[typography.micro, { color: colors.textMuted }]}>
                    {formatDuration(srv.durationMinutes)}
                  </Text>
                </View>
              </View>
              <Text style={[typography.bodyBold, { color: colors.primary }]}>
                {formatINR(srv.basePrice)}
              </Text>
            </View>
          ))}
        </AppCard>

        {/* Promo Coupon Section */}
        <AppCard style={styles.sectionCard}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginBottom: 10 }]}>
            PROMOTIONS & COUPONS
          </Text>
          {draft.appliedCoupon ? (
            <View style={styles.appliedCouponRow}>
              <View>
                <AppBadge variant="success">Code Applied: {draft.couponCode}</AppBadge>
                <Text style={[typography.caption, { color: '#10B981', marginTop: 4, fontWeight: '600' }]}>
                  Discount: -{formatINR(pricing.discountAmount)}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon} activeOpacity={0.7}>
                <Text style={[typography.caption, { color: colors.danger, fontWeight: '600' }]}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppInput
                  placeholder="Enter Promo Code (e.g. DIWALI25)"
                  value={couponInput}
                  onChangeText={setCouponInput}
                  autoCapitalize="characters"
                  style={{ marginBottom: 0 }}
                />
              </View>
              <AppButton
                title="Apply"
                onPress={handleApplyCoupon}
                loading={couponLoading}
                size="sm"
              />
            </View>
          )}
        </AppCard>

        {/* Loyalty Wallet Credit Toggle */}
        <AppCard style={styles.sectionCard}>
          <View style={styles.walletRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.metaRow}>
                <Icon name="wallet" size={16} color={colors.primary} />
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Use Saloon Wallet</Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Available Balance: ₹150 (Earned from visits)
              </Text>
            </View>
            <Switch
              value={draft.useWalletBalance}
              onValueChange={toggleWalletUsage}
              trackColor={{ false: '#E8EAF3', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </AppCard>

        {/* Detailed Price Calculation */}
        <AppCard style={styles.sectionCard} variant="elevated">
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginBottom: 12 }]}>
            PAYMENT BREAKDOWN
          </Text>

          <View style={styles.priceRow}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Item Subtotal</Text>
            <Text style={[typography.body, { color: colors.textPrimary }]}>{formatINR(pricing.subtotal)}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>GST & Taxes (18%)</Text>
            <Text style={[typography.body, { color: colors.textPrimary }]}>+{formatINR(pricing.gstAmount)}</Text>
          </View>

          {pricing.discountAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[typography.body, { color: '#10B981' }]}>Coupon Discount</Text>
              <Text style={[typography.body, { color: '#10B981', fontWeight: '700' }]}>
                -{formatINR(pricing.discountAmount)}
              </Text>
            </View>
          )}

          {pricing.walletDebit > 0 && (
            <View style={styles.priceRow}>
              <Text style={[typography.body, { color: colors.primary }]}>Wallet Credit</Text>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>
                -{formatINR(pricing.walletDebit)}
              </Text>
            </View>
          )}

          <View style={[styles.priceRow, styles.totalRow, { borderTopColor: '#E8EAF3' }]}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontWeight: '700' }]}>
              Total Amount Due
            </Text>
            <Text style={[typography.heading1, { color: colors.primary, fontWeight: '800' }]}>
              {formatINR(pricing.finalPayable)}
            </Text>
          </View>
        </AppCard>
      </ScrollView>

      {/* Checkout Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: '#FFFFFF', borderTopColor: '#E8EAF3' }]}>
        <View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Payable Now</Text>
          <Text style={[typography.heading2, { color: colors.primary, fontWeight: '800' }]}>
            {formatINR(pricing.finalPayable)}
          </Text>
        </View>
        <AppButton
          title="Proceed to Payment"
          onPress={onProceedToPayment}
          size="lg"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  serviceTextCol: {
    flex: 1,
    marginRight: 12,
  },
  appliedCouponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 6,
    marginBottom: 0,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
});
