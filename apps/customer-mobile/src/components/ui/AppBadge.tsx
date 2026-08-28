import React from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius, spacing, typography, useTheme } from '../../theme/index';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'error' | 'default';

export interface AppBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  children,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getBadgeColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryMuted, text: colors.primaryLight, border: colors.borderAccent };
      case 'secondary':
        return { bg: colors.secondaryMuted, text: colors.textSecondary, border: colors.border };
      case 'success':
        return { bg: colors.successMuted, text: colors.success, border: colors.successBorder };
      case 'warning':
        return { bg: colors.warningMuted, text: colors.warning, border: colors.warningBorder };
      case 'danger':
      case 'error':
        return { bg: colors.dangerMuted, text: colors.danger, border: colors.dangerBorder };
      case 'info':
        return { bg: colors.infoMuted, text: colors.info, border: colors.infoBorder };
      case 'neutral':
      case 'default':
      default:
        return { bg: colors.secondaryMuted, text: colors.textSecondary, border: colors.border };
    }
  };

  const badgeTheme = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeTheme.bg, borderColor: badgeTheme.border },
        style,
      ]}
    >
      <Text style={[typography.micro, { color: badgeTheme.text }, styles.text, textStyle]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
