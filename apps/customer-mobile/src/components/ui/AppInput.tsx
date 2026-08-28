import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius, spacing, typography, useTheme } from '../../theme/index';

export interface AppInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  prefix?: string;
  error?: string | null;
  helperText?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export const AppInput: React.FC<AppInputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  prefix,
  error,
  helperText,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  autoCapitalize = 'none',
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  editable = true,
  multiline = false,
  numberOfLines,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.input.bg,
            borderColor: error ? colors.danger : colors.input.border,
          },
          !editable ? styles.disabled : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        {prefix && <Text style={[typography.bodyBold, { color: colors.textAccent, marginRight: spacing.xs }]}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.input.placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[typography.body, styles.input, { color: colors.input.text }, inputStyle]}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={[typography.micro, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[typography.micro, { color: colors.textMuted, marginTop: spacing.xs }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  disabled: {
    opacity: 0.6,
  },
});
