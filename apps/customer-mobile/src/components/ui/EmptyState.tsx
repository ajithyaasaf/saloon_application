import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppButton } from './AppButton';
import { Icon, IconName } from './Icon';

export interface EmptyStateProps {
  title: string;
  description: string;
  iconName?: IconName;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  iconName = 'search',
  actionTitle,
  onActionPress,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxxl }, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceInset, marginBottom: spacing.md }]}>
        <Icon name={iconName} size={36} color={colors.primary} />
      </View>
      <Text style={[typography.heading2, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
        {description}
      </Text>
      {actionTitle && onActionPress && (
        <View style={{ marginTop: spacing.sm }}>
          <AppButton title={actionTitle} onPress={onActionPress} size="sm" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

