import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BookingDto, BookingStatus } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppCard } from '../../components/ui/AppCard';
import { AppButton } from '../../components/ui/AppButton';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../context/ToastContext';
import { customerBookingService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface BookingDetailScreenProps {
  bookingId: string;
  onBack: () => void;
  onLeaveReview: (salonId: string, branchId?: string) => void;
}

export const BookingDetailScreen: React.FC<BookingDetailScreenProps> = ({
  bookingId,
  onBack,
  onLeaveReview,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { showToast } = useToast();
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const data = await customerBookingService.getBookingById(bookingId);
        setBooking(data);
      } catch (err) {
        console.error('Failed to load booking:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  const handleCancelBooking = async () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this booking? Refund will be processed as per policy.',
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await customerBookingService.cancelBooking(bookingId, 'Customer requested cancellation');
              showToast('Appointment cancelled successfully', 'info');
              onBack();
            } catch (err: any) {
              showToast(err?.message || 'Failed to cancel appointment', 'error');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Appointment Details" showBack onBackPress={onBack} />
        <View style={{ padding: 20, gap: 16 }}>
          <SkeletonLoader height={160} borderRadius={16} />
          <SkeletonLoader height={200} borderRadius={16} />
        </View>
      </View>
    );
  }

  const isCancellable =
    booking.status === BookingStatus.CONFIRMED ||
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.IN_PROGRESS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Appointment Pass" showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pass QR / Summary Card */}
        <AppCard style={styles.passCard} variant="elevated">
          <View style={[styles.qrPlaceholder, { backgroundColor: '#F4F0FF' }]}>
            <Icon name="qr-code" size={48} color={colors.primary} />
            <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 8 }]}>
              Show this pass to salon desk on arrival
            </Text>
          </View>

          <View style={[styles.passDivider, { borderTopColor: '#E8EAF3' }]} />

          <View style={styles.passDetails}>
            <Text style={[typography.heading1, { color: colors.textPrimary, marginBottom: 4 }]}>
              {booking.salonName || 'Glamour Luxe Unisex Salon'}
            </Text>
            
            <View style={styles.metaRow}>
              <Icon name="map-pin" size={14} color={colors.primary} />
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {booking.branchName || 'Indiranagar Branch'}
              </Text>
            </View>
            
            <View style={[styles.metaRow, { marginTop: 6 }]}>
              <Icon name="calendar" size={14} color={colors.primary} />
              <Text style={[typography.bodyBold, { color: colors.primary }]}>
                {booking.bookingDate} • {booking.startTime} - {booking.endTime}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Current Status:</Text>
              <AppBadge variant={booking.status === BookingStatus.COMPLETED ? 'success' : 'primary'}>
                {booking.status}
              </AppBadge>
            </View>
          </View>
        </AppCard>

        {/* Services List */}
        <AppCard style={styles.servicesCard} variant="elevated">
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginBottom: 12 }]}>
            TREATMENTS INCLUDED
          </Text>
          {booking.services?.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, { borderBottomColor: '#E8EAF3' }]}>
              <View>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{item.serviceName}</Text>
                {item.staffName && (
                  <Text style={[typography.micro, { color: colors.textMuted }]}>Stylist: {item.staffName}</Text>
                )}
              </View>
              <Text style={[typography.bodyBold, { color: colors.primary }]}>
                {formatINR(item.price)}
              </Text>
            </View>
          ))}

          <View style={[styles.totalRow, { borderTopColor: '#E8EAF3' }]}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontWeight: '700' }]}>
              Total Amount
            </Text>
            <Text style={[typography.heading2, { color: colors.primary, fontWeight: '800' }]}>
              {formatINR(booking.totalAmount)}
            </Text>
          </View>
        </AppCard>

        {/* Actions */}
        <View style={styles.actionsCol}>
          {booking.status === BookingStatus.COMPLETED && (
            <AppButton
              title="Rate & Review Salon"
              onPress={() => onLeaveReview(booking.salonId, booking.branchId)}
              size="lg"
            />
          )}

          {isCancellable && (
            <AppButton
              title="Cancel Appointment"
              variant="danger"
              loading={cancelling}
              onPress={handleCancelBooking}
              size="md"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  passCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  qrPlaceholder: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  passDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  passDetails: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
  },
  servicesCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  actionsCol: {
    gap: 12,
    marginTop: 8,
  },
});
