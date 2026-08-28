import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NotificationItemDto } from '@saloon/shared-types';
import { formatUtcTo12HourTime } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppCard } from '../../components/ui/AppCard';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { notificationService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface NotificationCenterScreenProps {
  onBack: () => void;
}

export const NotificationCenterScreen: React.FC<NotificationCenterScreenProps> = ({ onBack }) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getInbox();
      setNotifications(res?.items || (res as any)?.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch {
      // Best-effort
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Notifications & Alerts" showBack onBackPress={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} height={80} borderRadius={14} />
            ))}
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Inbox Zero"
            description="You're all caught up! Booking updates and alerts will appear here."
            iconName="bell"
          />
        ) : (
          notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.7}
                onPress={() => handleMarkRead(n.id)}
              >
                <AppCard
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor: '#FFFFFF',
                      borderColor: isUnread ? colors.primary : '#E8EAF3',
                      borderLeftWidth: isUnread ? 4 : 1,
                      borderLeftColor: isUnread ? colors.primary : '#E8EAF3',
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                      <View style={[styles.bellCircle, { backgroundColor: '#F4F0FF' }]}>
                        <Icon name="bell" size={16} color={colors.primary} />
                      </View>
                      <Text style={[typography.bodyBold, { color: colors.textPrimary, flex: 1 }]}>
                        {n.title}
                      </Text>
                    </View>
                    {isUnread && <AppBadge variant="primary">New</AppBadge>}
                  </View>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6, lineHeight: 18 }]}>
                    {n.body}
                  </Text>
                  <Text style={[typography.micro, { color: colors.textMuted, marginTop: 8 }]}>
                    {formatUtcTo12HourTime(n.createdAt)} •{' '}
                    {new Date(n.createdAt).toLocaleDateString()}
                  </Text>
                </AppCard>
              </TouchableOpacity>
            );
          })
        )}
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
    gap: 12,
  },
  notificationCard: {
    padding: 16,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bellCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
