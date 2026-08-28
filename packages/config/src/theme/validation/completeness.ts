import { ThemeDefinition } from '../tokens.js';

export interface ThemeValidationResult {
  isValid: boolean;
  themeId: string;
  missingTokens: string[];
  errors: string[];
}

export function verifyThemeCompleteness(theme: ThemeDefinition): ThemeValidationResult {
  const missingTokens: string[] = [];
  const errors: string[] = [];

  if (!theme.id) missingTokens.push('theme.id');
  if (!theme.name) missingTokens.push('theme.name');
  if (!theme.appearance) missingTokens.push('theme.appearance');

  // Verify Background Colors
  const requiredBgKeys = ['canvas', 'surface', 'elevated', 'inset', 'inverse', 'overlay'] as const;
  requiredBgKeys.forEach((key) => {
    if (!theme.color?.background?.[key]) missingTokens.push(`color.background.${key}`);
  });

  // Verify Text Colors
  const requiredTextKeys = ['primary', 'secondary', 'muted', 'inverse', 'disabled'] as const;
  requiredTextKeys.forEach((key) => {
    if (!theme.color?.text?.[key]) missingTokens.push(`color.text.${key}`);
  });

  // Verify Border Colors
  const requiredBorderKeys = ['subtle', 'default', 'strong', 'focus', 'error'] as const;
  requiredBorderKeys.forEach((key) => {
    if (!theme.color?.border?.[key]) missingTokens.push(`color.border.${key}`);
  });

  // Verify Action Colors
  const requiredActionKeys = [
    'primary',
    'primaryHover',
    'primaryActive',
    'primarySubtle',
    'secondary',
    'secondaryHover',
    'secondaryActive',
    'ghostHover',
    'ghostActive',
    'destructive',
    'destructiveHover',
    'destructiveSubtle',
    'disabled',
  ] as const;
  requiredActionKeys.forEach((key) => {
    if (!theme.color?.action?.[key]) missingTokens.push(`color.action.${key}`);
  });

  // Verify Status Colors
  const requiredStatusKeys = [
    'success',
    'successSubtle',
    'successBorder',
    'warning',
    'warningSubtle',
    'warningBorder',
    'error',
    'errorSubtle',
    'errorBorder',
    'info',
    'infoSubtle',
    'infoBorder',
  ] as const;
  requiredStatusKeys.forEach((key) => {
    if (!theme.color?.status?.[key]) missingTokens.push(`color.status.${key}`);
  });

  // Verify Typography Roles
  const requiredTypoRoles = [
    'display',
    'pageTitle',
    'sectionTitle',
    'cardTitle',
    'bodyLarge',
    'body',
    'bodySecondary',
    'caption',
    'label',
    'button',
  ] as const;
  requiredTypoRoles.forEach((role) => {
    if (!theme.typography?.[role]?.fontSize) missingTokens.push(`typography.${role}.fontSize`);
    if (!theme.typography?.[role]?.fontFamily) missingTokens.push(`typography.${role}.fontFamily`);
  });

  // Verify Component Tokens
  if (!theme.button?.primary?.background) missingTokens.push('button.primary.background');
  if (!theme.button?.primary?.text) missingTokens.push('button.primary.text');
  if (!theme.button?.secondary?.background) missingTokens.push('button.secondary.background');
  if (!theme.button?.ghost?.text) missingTokens.push('button.ghost.text');
  if (!theme.button?.destructive?.background) missingTokens.push('button.destructive.background');
  if (!theme.button?.disabled?.background) missingTokens.push('button.disabled.background');

  if (!theme.input?.background) missingTokens.push('input.background');
  if (!theme.input?.borderFocus) missingTokens.push('input.borderFocus');
  if (!theme.input?.placeholder) missingTokens.push('input.placeholder');

  if (!theme.card?.background) missingTokens.push('card.background');
  if (!theme.card?.border) missingTokens.push('card.border');
  if (!theme.card?.radius) missingTokens.push('card.radius');

  if (!theme.badge?.success?.background) missingTokens.push('badge.success.background');
  if (!theme.badge?.warning?.background) missingTokens.push('badge.warning.background');
  if (!theme.badge?.error?.background) missingTokens.push('badge.error.background');
  if (!theme.badge?.info?.background) missingTokens.push('badge.info.background');
  if (!theme.badge?.neutral?.background) missingTokens.push('badge.neutral.background');
  if (!theme.badge?.primary?.background) missingTokens.push('badge.primary.background');

  if (!theme.table?.header?.background) missingTokens.push('table.header.background');
  if (!theme.table?.row?.background) missingTokens.push('table.row.background');

  if (!theme.modal?.background) missingTokens.push('modal.background');
  if (!theme.modal?.overlay) missingTokens.push('modal.overlay');

  if (!theme.drawer?.background) missingTokens.push('drawer.background');
  if (!theme.sidebar?.background) missingTokens.push('sidebar.background');
  if (!theme.sidebar?.item?.textActive) missingTokens.push('sidebar.item.textActive');

  if (!theme.header?.background) missingTokens.push('header.background');
  if (!theme.navigation?.background) missingTokens.push('navigation.background');
  if (!theme.navigation?.itemActive) missingTokens.push('navigation.itemActive');

  // Verify Density
  if (!theme.density?.compact?.inputHeight) missingTokens.push('density.compact.inputHeight');
  if (!theme.density?.comfortable?.inputHeight) missingTokens.push('density.comfortable.inputHeight');

  // Verify Shadows
  if (!theme.shadow?.none) missingTokens.push('shadow.none');
  if (!theme.shadow?.sm) missingTokens.push('shadow.sm');
  if (!theme.shadow?.md) missingTokens.push('shadow.md');
  if (!theme.shadow?.lg) missingTokens.push('shadow.lg');

  return {
    isValid: missingTokens.length === 0 && errors.length === 0,
    themeId: theme?.id || 'unknown',
    missingTokens,
    errors,
  };
}
