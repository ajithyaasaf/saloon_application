import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius, spacing, typography, useTheme } from '../../theme/index';

export interface AppCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'glass';
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  title,
  subtitle,
  headerRight,
  onPress,
  style,
  variant = 'default',
}) => {
  const { colors } = useTheme();

  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.backgroundElevated,
          borderColor: colors.borderHighlight,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        };
      case 'glass':
        return {
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.borderAccent,
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        };
    }
  };

  const containerStyles = [
    styles.base,
    getCardStyle(),
    style,
  ];

  const headerContent = (title || subtitle || headerRight) ? (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        {title && <Text style={[typography.heading2, { color: colors.textPrimary }]}>{title}</Text>}
        {subtitle && <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>}
      </View>
      {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
    </View>
  ) : null;

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={containerStyles}
      >
        {headerContent}
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyles}>
      {headerContent}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  headerRight: {
    marginLeft: spacing.sm,
  },
});
