import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookingStatus, BookingSummaryDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppCard } from '../../components/ui/AppCard';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { customerBookingService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface MyBookingsScreenProps {
  onSelectBooking: (bookingId: string) => void;
  onExploreSalons: () => void;
}

type TabType = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
  onSelectBooking,
  onExploreSalons,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const [bookings, setBookings] = useState<BookingSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
    try {
      const data = await customerBookingService.getMyBookings();
      setBookings(data?.items || (data as any) || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'UPCOMING') {
      return (
        b.status === BookingStatus.CONFIRMED ||
        b.status === BookingStatus.PENDING ||
        b.status === BookingStatus.IN_PROGRESS
      );
    }
    if (activeTab === 'COMPLETED') {
      return b.status === BookingStatus.COMPLETED;
    }
    return b.status === BookingStatus.CANCELLED || b.status === BookingStatus.NO_SHOW;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return <AppBadge variant="success">Confirmed</AppBadge>;
      case BookingStatus.PENDING:
        return <AppBadge variant="warning">Pending</AppBadge>;
      case BookingStatus.IN_PROGRESS:
        return <AppBadge variant="primary">In Service</AppBadge>;
      case BookingStatus.COMPLETED:
        return <AppBadge variant="neutral">Completed</AppBadge>;
      case BookingStatus.CANCELLED:
        return <AppBadge variant="error">Cancelled</AppBadge>;
      default:
        return <AppBadge variant="neutral">{status}</AppBadge>;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="My Appointments" subtitle="Manage upcoming and past visits" />

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: '#E8EAF3', backgroundColor: '#FFFFFF' }]}>
        {(['UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: isActive ? colors.primary : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} height={140} borderRadius={16} />
            ))}
          </View>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            title="No Appointments"
            description={`You have no ${activeTab.toLowerCase()} salon bookings.`}
            iconName="calendar"
            actionTitle="Discover Salons"
            onActionPress={onExploreSalons}
          />
        ) : (
          filteredBookings.map((b) => (
            <AppCard
              key={b.id}
              onPress={() => onSelectBooking(b.id)}
              style={styles.bookingCard}
              variant="elevated"
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: 4 }]}>
                    {b.salonName || 'Glamour Luxe Salon'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Icon name="map-pin" size={13} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {b.branchName || 'Indiranagar Branch'}
                    </Text>
                  </View>
                </View>
                {getStatusBadge(b.status)}
              </View>

              <View style={[styles.timeInfoRow, { backgroundColor: '#F4F0FF', borderRadius: 10, padding: 10 }]}>
                <View style={styles.metaRow}>
                  <Icon name="calendar" size={14} color={colors.primary} />
                  <Text style={[typography.bodyBold, { color: colors.primary }]}>{b.bookingDate}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}> • </Text>
                  <Icon name="clock" size={14} color={colors.primary} />
                  <Text style={[typography.bodyBold, { color: colors.primary }]}>
                    {b.startTime} - {b.endTime}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: '#E8EAF3', paddingTop: 10 }]}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {b.services?.length || 1} Service(s) • Total: {formatINR(b.totalAmount || 899)}
                </Text>
                <View style={styles.viewDetailsRow}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                    View Pass
                  </Text>
                  <Icon name="chevron-right" size={14} color={colors.primary} />
                </View>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  bookingCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeInfoRow: {
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
