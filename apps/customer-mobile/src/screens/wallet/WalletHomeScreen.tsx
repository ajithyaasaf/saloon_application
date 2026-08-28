import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatINR } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppCard } from '../../components/ui/AppCard';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

export interface WalletHomeScreenProps {
  onViewLoyaltyLedger: () => void;
  onViewMembership: () => void;
  onViewReferrals: () => void;
}

export const WalletHomeScreen: React.FC<WalletHomeScreenProps> = ({
  onViewLoyaltyLedger,
  onViewMembership,
  onViewReferrals,
}) => {
  const { user } = useAuth();
  const { colors, spacing, typography, borderRadius } = useTheme();

  // Mock wallet balance data
  const totalWalletBalance = 250;
  const totalLoyaltyPoints = 450;
  const membership = { name: 'Gold Tier' };

  const transactions = [
    {
      id: 'tx-1',
      title: 'Appointment Cashback (Luxe Salon)',
      amount: 50,
      type: 'credit',
      date: '2026-08-15',
    },
    {
      id: 'tx-2',
      title: 'Referral Bonus (Friend Joined)',
      amount: 200,
      type: 'credit',
      date: '2026-08-10',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Wallet & Rewards" subtitle="Cashbacks, loyalty points & membership" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wallet Balance Hero Card (Royal Purple Card) */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroLabel}>AVAILABLE SALOON CASH</Text>
          <Text style={styles.heroBalance}>
            {formatINR(totalWalletBalance)}
          </Text>
          <Text style={styles.heroDesc}>
            Auto-applied to your next appointment at checkout
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <AppCard style={styles.statCard} onPress={onViewLoyaltyLedger} variant="elevated">
            <View style={[styles.statIconCircle, { backgroundColor: '#F4F0FF' }]}>
              <Icon name="sparkles" size={24} color={colors.primary} />
            </View>
            <Text style={[typography.heading1, { color: colors.textPrimary, marginVertical: 4 }]}>
              {totalLoyaltyPoints}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Loyalty Points</Text>
            <View style={styles.actionRow}>
              <Text style={[typography.micro, { color: colors.primary, fontWeight: '700' }]}>
                View History
              </Text>
              <Icon name="chevron-right" size={12} color={colors.primary} />
            </View>
          </AppCard>

          <AppCard style={styles.statCard} onPress={onViewMembership} variant="elevated">
            <View style={[styles.statIconCircle, { backgroundColor: '#FFFBEB' }]}>
              <Icon name="crown" size={24} color="#F59E0B" />
            </View>
            <Text style={[typography.heading2, { color: colors.textPrimary, marginVertical: 6 }]}>
              {membership?.name || 'Gold Tier'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>VIP Membership</Text>
            <View style={styles.actionRow}>
              <Text style={[typography.micro, { color: colors.primary, fontWeight: '700' }]}>
                View Benefits
              </Text>
              <Icon name="chevron-right" size={12} color={colors.primary} />
            </View>
          </AppCard>
        </View>

        {/* Invite & Earn Banner */}
        <AppCard style={styles.referralBanner} onPress={onViewReferrals} variant="elevated">
          <View style={styles.referralContent}>
            <View style={[styles.referralIconCircle, { backgroundColor: '#F4F0FF' }]}>
              <Icon name="gift" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Refer Friends & Get ₹200
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Share your invite code with friends to earn salon wallet cash.
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </View>
        </AppCard>

        {/* Recent Transactions */}
        <View style={styles.historySection}>
          <Text style={[typography.heading2, { color: colors.textPrimary, marginBottom: 12 }]}>
            Recent Wallet Transactions
          </Text>

          {transactions.map((tx) => (
            <AppCard key={tx.id} style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={[styles.txIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="check" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{tx.title}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{tx.date}</Text>
                </View>
                <Text style={[typography.bodyBold, { color: '#10B981', fontWeight: '700' }]}>
                  +{formatINR(tx.amount)}
                </Text>
              </View>
            </AppCard>
          ))}
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
  heroCard: {
    padding: 24,
    borderRadius: 22,
    marginBottom: 20,
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heroBalance: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  referralBanner: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    marginBottom: 24,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  referralIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {},
  txCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    marginBottom: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
