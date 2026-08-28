import { ThemeDefinition } from './tokens.js';
import { primitiveSpacing, primitiveRadius, primitiveShadow, primitiveMotion } from './primitives.js';

export function generateCSSVariables(theme: ThemeDefinition): string {
  return `
:root {
  /* ==========================================================================
     Theme Metadata
     ========================================================================== */
  --theme-id: "${theme.id}";
  --theme-name: "${theme.name}";
  --theme-appearance: "${theme.appearance}";

  /* ==========================================================================
     Layer 2: Semantic Color Tokens
     ========================================================================== */
  --color-background-canvas: ${theme.color.background.canvas};
  --color-background-surface: ${theme.color.background.surface};
  --color-background-elevated: ${theme.color.background.elevated};
  --color-background-inset: ${theme.color.background.inset};
  --color-background-inverse: ${theme.color.background.inverse};
  --color-background-overlay: ${theme.color.background.overlay};

  --color-text-primary: ${theme.color.text.primary};
  --color-text-secondary: ${theme.color.text.secondary};
  --color-text-muted: ${theme.color.text.muted};
  --color-text-inverse: ${theme.color.text.inverse};
  --color-text-disabled: ${theme.color.text.disabled};

  --color-border-subtle: ${theme.color.border.subtle};
  --color-border-default: ${theme.color.border.default};
  --color-border-strong: ${theme.color.border.strong};
  --color-border-focus: ${theme.color.border.focus};
  --color-border-error: ${theme.color.border.error};

  --color-action-primary: ${theme.color.action.primary};
  --color-action-primary-hover: ${theme.color.action.primaryHover};
  --color-action-primary-active: ${theme.color.action.primaryActive};
  --color-action-primary-subtle: ${theme.color.action.primarySubtle};
  --color-action-secondary: ${theme.color.action.secondary};
  --color-action-secondary-hover: ${theme.color.action.secondaryHover};
  --color-action-secondary-active: ${theme.color.action.secondaryActive};
  --color-action-ghost-hover: ${theme.color.action.ghostHover};
  --color-action-ghost-active: ${theme.color.action.ghostActive};
  --color-action-destructive: ${theme.color.action.destructive};
  --color-action-destructive-hover: ${theme.color.action.destructiveHover};
  --color-action-destructive-subtle: ${theme.color.action.destructiveSubtle};
  --color-action-disabled: ${theme.color.action.disabled};

  --color-interactive-hover: ${theme.color.interactive.hover};
  --color-interactive-active: ${theme.color.interactive.active};
  --color-interactive-selected: ${theme.color.interactive.selected};
  --color-interactive-focus-ring: ${theme.color.interactive.focusRing};
  --color-interactive-disabled: ${theme.color.interactive.disabled};

  --color-status-success: ${theme.color.status.success};
  --color-status-success-subtle: ${theme.color.status.successSubtle};
  --color-status-success-border: ${theme.color.status.successBorder};
  --color-status-warning: ${theme.color.status.warning};
  --color-status-warning-subtle: ${theme.color.status.warningSubtle};
  --color-status-warning-border: ${theme.color.status.warningBorder};
  --color-status-error: ${theme.color.status.error};
  --color-status-error-subtle: ${theme.color.status.errorSubtle};
  --color-status-error-border: ${theme.color.status.errorBorder};
  --color-status-info: ${theme.color.status.info};
  --color-status-info-subtle: ${theme.color.status.infoSubtle};
  --color-status-info-border: ${theme.color.status.infoBorder};

  /* ==========================================================================
     Layer 3: Component Tokens
     ========================================================================== */
  --button-primary-background: ${theme.button.primary.background};
  --button-primary-background-hover: ${theme.button.primary.backgroundHover};
  --button-primary-background-active: ${theme.button.primary.backgroundActive};
  --button-primary-text: ${theme.button.primary.text};
  --button-primary-border: ${theme.button.primary.border};
  --button-primary-shadow: ${theme.button.primary.shadow};

  --button-secondary-background: ${theme.button.secondary.background};
  --button-secondary-background-hover: ${theme.button.secondary.backgroundHover};
  --button-secondary-background-active: ${theme.button.secondary.backgroundActive};
  --button-secondary-text: ${theme.button.secondary.text};
  --button-secondary-border: ${theme.button.secondary.border};

  --button-ghost-background: ${theme.button.ghost.background};
  --button-ghost-background-hover: ${theme.button.ghost.backgroundHover};
  --button-ghost-background-active: ${theme.button.ghost.backgroundActive};
  --button-ghost-text: ${theme.button.ghost.text};

  --button-destructive-background: ${theme.button.destructive.background};
  --button-destructive-background-hover: ${theme.button.destructive.backgroundHover};
  --button-destructive-background-active: ${theme.button.destructive.backgroundActive};
  --button-destructive-text: ${theme.button.destructive.text};
  --button-destructive-border: ${theme.button.destructive.border};

  --button-disabled-background: ${theme.button.disabled.background};
  --button-disabled-text: ${theme.button.disabled.text};
  --button-disabled-border: ${theme.button.disabled.border};

  --input-background: ${theme.input.background};
  --input-text: ${theme.input.text};
  --input-placeholder: ${theme.input.placeholder};
  --input-border: ${theme.input.border};
  --input-border-hover: ${theme.input.borderHover};
  --input-border-focus: ${theme.input.borderFocus};
  --input-border-error: ${theme.input.borderError};
  --input-focus-ring: ${theme.input.focusRing};
  --input-disabled-background: ${theme.input.disabledBackground};
  --input-disabled-text: ${theme.input.disabledText};

  --card-background: ${theme.card.background};
  --card-border: ${theme.card.border};
  --card-border-hover: ${theme.card.borderHover};
  --card-shadow: ${theme.card.shadow};
  --card-radius: ${theme.card.radius};

  --badge-success-background: ${theme.badge.success.background};
  --badge-success-text: ${theme.badge.success.text};
  --badge-success-border: ${theme.badge.success.border};

  --badge-warning-background: ${theme.badge.warning.background};
  --badge-warning-text: ${theme.badge.warning.text};
  --badge-warning-border: ${theme.badge.warning.border};

  --badge-error-background: ${theme.badge.error.background};
  --badge-error-text: ${theme.badge.error.text};
  --badge-error-border: ${theme.badge.error.border};

  --badge-info-background: ${theme.badge.info.background};
  --badge-info-text: ${theme.badge.info.text};
  --badge-info-border: ${theme.badge.info.border};

  --badge-neutral-background: ${theme.badge.neutral.background};
  --badge-neutral-text: ${theme.badge.neutral.text};
  --badge-neutral-border: ${theme.badge.neutral.border};

  --badge-primary-background: ${theme.badge.primary.background};
  --badge-primary-text: ${theme.badge.primary.text};
  --badge-primary-border: ${theme.badge.primary.border};

  --table-header-background: ${theme.table.header.background};
  --table-header-text: ${theme.table.header.text};
  --table-header-border: ${theme.table.header.border};
  --table-row-background: ${theme.table.row.background};
  --table-row-background-hover: ${theme.table.row.backgroundHover};
  --table-row-background-selected: ${theme.table.row.backgroundSelected};
  --table-row-border: ${theme.table.row.border};
  --table-row-text: ${theme.table.row.text};

  --modal-background: ${theme.modal.background};
  --modal-overlay: ${theme.modal.overlay};
  --modal-border: ${theme.modal.border};
  --modal-shadow: ${theme.modal.shadow};
  --modal-radius: ${theme.modal.radius};

  --drawer-background: ${theme.drawer.background};
  --drawer-border: ${theme.drawer.border};
  --drawer-shadow: ${theme.drawer.shadow};

  --sidebar-background: ${theme.sidebar.background};
  --sidebar-border: ${theme.sidebar.border};
  --sidebar-item-background-hover: ${theme.sidebar.item.backgroundHover};
  --sidebar-item-background-active: ${theme.sidebar.item.backgroundActive};
  --sidebar-item-text: ${theme.sidebar.item.text};
  --sidebar-item-text-active: ${theme.sidebar.item.textActive};
  --sidebar-item-border-active: ${theme.sidebar.item.borderActive};

  --header-background: ${theme.header.background};
  --header-border: ${theme.header.border};
  --header-text: ${theme.header.text};

  --navigation-background: ${theme.navigation.background};
  --navigation-item-active: ${theme.navigation.itemActive};
  --navigation-item-hover: ${theme.navigation.itemHover};
  --navigation-item-inactive: ${theme.navigation.itemInactive};
  --navigation-border: ${theme.navigation.border};

  /* ==========================================================================
     Scales: Spacing, Radius, Shadow & Motion
     ========================================================================== */
  --space-0: ${primitiveSpacing[0]};
  --space-1: ${primitiveSpacing[1]};
  --space-2: ${primitiveSpacing[2]};
  --space-3: ${primitiveSpacing[3]};
  --space-4: ${primitiveSpacing[4]};
  --space-5: ${primitiveSpacing[5]};
  --space-6: ${primitiveSpacing[6]};
  --space-8: ${primitiveSpacing[8]};
  --space-10: ${primitiveSpacing[10]};
  --space-12: ${primitiveSpacing[12]};
  --space-16: ${primitiveSpacing[16]};

  --radius-none: ${primitiveRadius.none};
  --radius-sm: ${primitiveRadius.sm};
  --radius-md: ${primitiveRadius.md};
  --radius-lg: ${primitiveRadius.lg};
  --radius-xl: ${primitiveRadius.xl};
  --radius-full: ${primitiveRadius.full};

  --shadow-none: ${primitiveShadow.none};
  --shadow-sm: ${primitiveShadow.sm};
  --shadow-md: ${primitiveShadow.md};
  --shadow-lg: ${primitiveShadow.lg};

  --motion-duration-fast: ${primitiveMotion.duration.fast};
  --motion-duration-normal: ${primitiveMotion.duration.normal};
  --motion-duration-slow: ${primitiveMotion.duration.slow};
  --motion-easing-standard: ${primitiveMotion.easing.standard};
  --motion-easing-enter: ${primitiveMotion.easing.enter};
  --motion-easing-exit: ${primitiveMotion.easing.exit};
}
`.trim();
}
