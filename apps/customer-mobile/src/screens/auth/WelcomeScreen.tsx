import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../../components/ui/AppButton';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme/ThemeContext';

export interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.heroSection}>
        <View style={[styles.brandIconCircle, { backgroundColor: '#F4F0FF' }]}>
          <Icon name="scissors" size={44} color={colors.primary} />
        </View>
        <Text style={[typography.display, { color: colors.primary, letterSpacing: 3, fontWeight: '800' }]}>
          SALOON
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
          Luxury Grooming & Wellness Appointments at Premium Salons
        </Text>
      </View>

      <View style={styles.benefitList}>
        <View style={[styles.benefitItem, { backgroundColor: '#FFFFFF', borderColor: '#E8EAF3' }]}>
          <View style={[styles.benefitIconCircle, { backgroundColor: '#F4F0FF' }]}>
            <Icon name="sparkles" size={22} color={colors.primary} />
          </View>
          <View style={styles.benefitTextCol}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontSize: 16 }]}>
              Top Rated Stylists
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Book expert haircut, facial, and styling professionals.
            </Text>
          </View>
        </View>

        <View style={[styles.benefitItem, { backgroundColor: '#FFFFFF', borderColor: '#E8EAF3' }]}>
          <View style={[styles.benefitIconCircle, { backgroundColor: '#F4F0FF' }]}>
            <Icon name="zap" size={22} color={colors.primary} />
          </View>
          <View style={styles.benefitTextCol}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontSize: 16 }]}>
              Instant Confirmation
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Guaranteed real-time booking with 10-min slot lock.
            </Text>
          </View>
        </View>

        <View style={[styles.benefitItem, { backgroundColor: '#FFFFFF', borderColor: '#E8EAF3' }]}>
          <View style={[styles.benefitIconCircle, { backgroundColor: '#F4F0FF' }]}>
            <Icon name="gift" size={22} color={colors.primary} />
          </View>
          <View style={styles.benefitTextCol}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontSize: 16 }]}>
              Loyalty Rewards
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Earn points on every visit and redeem cashbacks.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <AppButton title="Get Started" onPress={onGetStarted} size="lg" />
        <Text style={[typography.micro, { color: colors.textMuted, textAlign: 'center', marginTop: 10 }]}>
          By continuing, you agree to Saloon's Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
  },
  brandIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  benefitList: {
    gap: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  benefitIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  benefitTextCol: {
    flex: 1,
  },
  bottomSection: {
    marginTop: 20,
  },
});
