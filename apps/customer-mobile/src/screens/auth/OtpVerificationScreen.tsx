import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { maskPhone } from '@saloon/shared-utils';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

export interface OtpVerificationScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const { phoneDraft, verifyOtp, sendOtp } = useAuth();
  const { showToast } = useToast();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleVerify = async () => {
    setError(null);
    if (!otp || otp.length < 6) {
      setError('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(otp);
      showToast('Welcome to Saloon!', 'success');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP. Please try again.');
      showToast(err?.message || 'OTP Verification Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp(phoneDraft);
      setResendTimer(30);
      showToast('New verification code sent!', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to resend OTP', 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonRow} activeOpacity={0.7}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
          <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
            Change Number
          </Text>
        </TouchableOpacity>
        
        <Text style={[typography.heading1, { color: colors.textPrimary, marginBottom: 6 }]}>
          Verify Code
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 24, lineHeight: 22 }]}>
          Sent 6-digit code to {maskPhone(phoneDraft || '9876543210')}
        </Text>

        <AppInput
          label="Enter 6-Digit OTP"
          placeholder="123456"
          value={otp}
          onChangeText={(txt) => {
            setOtp(txt);
            setError(null);
          }}
          keyboardType="number-pad"
          maxLength={6}
          error={error}
        />

        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Resend code in {resendTimer}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                Resend Verification Code
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <AppButton
          title="Verify & Continue"
          onPress={handleVerify}
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
  resendRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  bottomSection: {},
});
