import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { borderRadius, spacing, typography, useTheme } from '../../theme/index';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return { bg: colors.success, text: colors.textInverse };
      case 'error':
        return { bg: colors.danger, text: colors.textInverse };
      case 'info':
        return { bg: colors.primary, text: colors.button.primaryText };
    }
  };

  const toastStyle = getToastColors();

  return (
    <View style={[styles.container, { backgroundColor: toastStyle.bg }]}>
      <Text style={[typography.bodyBold, { color: toastStyle.text }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
});
