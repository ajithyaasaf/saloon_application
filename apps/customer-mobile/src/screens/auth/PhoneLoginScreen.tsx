import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { isValidIndianPhone, normalizeIndianPhone } from '@saloon/shared-utils';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

export interface PhoneLoginScreenProps {
  onOtpSent: () => void;
  onBack?: () => void;
}

export const PhoneLoginScreen: React.FC<PhoneLoginScreenProps> = ({ onOtpSent, onBack }) => {
  const { sendOtp } = useAuth();
  const { showToast } = useToast();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    if (!phone) {
      setError('Please enter your mobile phone number');
      return;
    }

    const normalized = normalizeIndianPhone(phone);
    if (!isValidIndianPhone(normalized)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      await sendOtp(normalized);
      showToast('OTP sent to your phone number!', 'success');
      onOtpSent();
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
      showToast(err?.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButtonRow} activeOpacity={0.7}>
            <Icon name="arrow-left" size={20} color={colors.textPrimary} />
            <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
              Back
            </Text>
          </TouchableOpacity>
        )}
        <Text style={[typography.heading1, { color: colors.textPrimary, marginBottom: 6 }]}>
          Enter Phone Number
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 24, lineHeight: 22 }]}>
          We will send a 6-digit verification code to this mobile number.
        </Text>

        <AppInput
          label="Mobile Phone Number"
          prefix="+91"
          placeholder="98765 43210"
          value={phone}
          onChangeText={(txt) => {
            setPhone(txt);
            setError(null);
          }}
          keyboardType="phone-pad"
          maxLength={10}
          error={error}
        />
      </View>

      <View style={styles.bottomSection}>
        <AppButton
          title="Send Verification Code"
          onPress={handleSendOtp}
          loading={loading}
          size="lg"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topSection: {},
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  bottomSection: {},
});
