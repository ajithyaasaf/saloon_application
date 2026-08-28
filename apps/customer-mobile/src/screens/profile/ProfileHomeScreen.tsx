import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { maskPhone } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppCard } from '../../components/ui/AppCard';
import { AppButton } from '../../components/ui/AppButton';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

export interface ProfileHomeScreenProps {
  onEditProfile: () => void;
  onViewNotifications: () => void;
  onViewReferrals: () => void;
}

export const ProfileHomeScreen: React.FC<ProfileHomeScreenProps> = ({
  onEditProfile,
  onViewNotifications,
  onViewReferrals,
}) => {
  const { user, logout } = useAuth();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const fullName = `${user?.firstName || 'Valued'} ${user?.lastName || 'Customer'}`.trim();
  const phone = user?.phone ? maskPhone(user.phone) : '+91 98765 43210';
  const email = user?.email || 'customer@saloon.in';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="My Profile" subtitle="Account settings & preferences" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <AppCard style={styles.profileCard} variant="elevated">
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: '#F4F0FF' }]}>
              <Icon name="user" size={32} color={colors.primary} />
            </View>
            <View style={styles.nameSection}>
              <Text style={[typography.heading1, { color: colors.textPrimary }]}>{fullName}</Text>
              
              <View style={styles.metaRow}>
                <Icon name="phone" size={13} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{phone}</Text>
              </View>
              
              <View style={styles.metaRow}>
                <Icon name="mail" size={13} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{email}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity onPress={onEditProfile} style={[styles.editProfileBtn, { borderTopColor: '#E8EAF3' }]}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              Edit Profile Details
            </Text>
            <Icon name="chevron-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        </AppCard>

        {/* Quick Menu List */}
        <View style={styles.menuSection}>
          <AppCard style={styles.menuCard} onPress={onViewNotifications}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#F4F0FF' }]}>
                <Icon name="bell" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  Notifications & Alerts
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Booking updates, reminders, and offers
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </AppCard>

          <AppCard style={styles.menuCard} onPress={onViewReferrals}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#F4F0FF' }]}>
                <Icon name="gift" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  Referral Program & Rewards
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Invite friends to earn wallet credits
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </AppCard>

          <AppCard style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="shield" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Privacy & Security</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  RBI compliance, 256-bit encrypted data
                </Text>
              </View>
              <AppBadge variant="success">Protected</AppBadge>
            </View>
          </AppCard>

          <AppCard style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#F1F2F9' }]}>
                <Icon name="info" size={20} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Saloon App Version</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>v1.0.0 (Production Build)</Text>
              </View>
            </View>
          </AppCard>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <AppButton
            title="Log Out of Account"
            variant="danger"
            onPress={logout}
            size="md"
          />
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
    paddingBottom: 40,
  },
  profileCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    marginBottom: 20,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  menuSection: {
    gap: 12,
    marginBottom: 24,
  },
  menuCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutSection: {
    marginTop: 8,
  },
});
