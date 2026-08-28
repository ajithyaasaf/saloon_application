'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  availableThemes,
  defaultTheme,
  getThemeById,
  ThemeDefinition,
} from '@saloon/config';

interface ThemeContextType {
  theme: ThemeDefinition;
  activeThemeId: string;
  availableThemeIds: string[];
  setTheme: (themeId: string) => void;
  isLoaded: boolean;
}

const THEME_STORAGE_KEY = 'saloon_admin_theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  activeThemeId: defaultTheme.id,
  availableThemeIds: Object.keys(availableThemes),
  setTheme: () => {},
  isLoaded: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode; defaultThemeId?: string }> = ({
  children,
  defaultThemeId = 'light-minimal',
}) => {
  const [activeThemeId, setActiveThemeId] = useState<string>(defaultThemeId);
  const [theme, setThemeState] = useState<ThemeDefinition>(getThemeById(defaultThemeId));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const applyThemeToDOM = (selectedTheme: ThemeDefinition) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-theme', selectedTheme.id);
    root.setAttribute('data-appearance', selectedTheme.appearance);

    // Apply Layer 2 Semantic Colors
    root.style.setProperty('--color-background-canvas', selectedTheme.color.background.canvas);
    root.style.setProperty('--color-background-surface', selectedTheme.color.background.surface);
    root.style.setProperty('--color-background-elevated', selectedTheme.color.background.elevated);
    root.style.setProperty('--color-background-inset', selectedTheme.color.background.inset);
    root.style.setProperty('--color-background-inverse', selectedTheme.color.background.inverse);
    root.style.setProperty('--color-background-overlay', selectedTheme.color.background.overlay);

    root.style.setProperty('--color-text-primary', selectedTheme.color.text.primary);
    root.style.setProperty('--color-text-secondary', selectedTheme.color.text.secondary);
    root.style.setProperty('--color-text-muted', selectedTheme.color.text.muted);
    root.style.setProperty('--color-text-inverse', selectedTheme.color.text.inverse);
    root.style.setProperty('--color-text-disabled', selectedTheme.color.text.disabled);

    root.style.setProperty('--color-border-subtle', selectedTheme.color.border.subtle);
    root.style.setProperty('--color-border-default', selectedTheme.color.border.default);
    root.style.setProperty('--color-border-strong', selectedTheme.color.border.strong);
    root.style.setProperty('--color-border-focus', selectedTheme.color.border.focus);
    root.style.setProperty('--color-border-error', selectedTheme.color.border.error);

    root.style.setProperty('--color-action-primary', selectedTheme.color.action.primary);
    root.style.setProperty('--color-action-primary-hover', selectedTheme.color.action.primaryHover);
    root.style.setProperty('--color-action-primary-active', selectedTheme.color.action.primaryActive);
    root.style.setProperty('--color-action-primary-subtle', selectedTheme.color.action.primarySubtle);
    root.style.setProperty('--color-action-secondary', selectedTheme.color.action.secondary);
    root.style.setProperty('--color-action-secondary-hover', selectedTheme.color.action.secondaryHover);
    root.style.setProperty('--color-action-ghost-hover', selectedTheme.color.action.ghostHover);
    root.style.setProperty('--color-action-destructive', selectedTheme.color.action.destructive);
    root.style.setProperty('--color-action-destructive-hover', selectedTheme.color.action.destructiveHover);

    root.style.setProperty('--color-status-success', selectedTheme.color.status.success);
    root.style.setProperty('--color-status-success-subtle', selectedTheme.color.status.successSubtle);
    root.style.setProperty('--color-status-success-border', selectedTheme.color.status.successBorder);
    root.style.setProperty('--color-status-warning', selectedTheme.color.status.warning);
    root.style.setProperty('--color-status-warning-subtle', selectedTheme.color.status.warningSubtle);
    root.style.setProperty('--color-status-warning-border', selectedTheme.color.status.warningBorder);
    root.style.setProperty('--color-status-error', selectedTheme.color.status.error);
    root.style.setProperty('--color-status-error-subtle', selectedTheme.color.status.errorSubtle);
    root.style.setProperty('--color-status-error-border', selectedTheme.color.status.errorBorder);
    root.style.setProperty('--color-status-info', selectedTheme.color.status.info);
    root.style.setProperty('--color-status-info-subtle', selectedTheme.color.status.infoSubtle);
    root.style.setProperty('--color-status-info-border', selectedTheme.color.status.infoBorder);

    // Apply Layer 3 Component Tokens
    root.style.setProperty('--button-primary-background', selectedTheme.button.primary.background);
    root.style.setProperty('--button-primary-background-hover', selectedTheme.button.primary.backgroundHover);
    root.style.setProperty('--button-primary-background-active', selectedTheme.button.primary.backgroundActive);
    root.style.setProperty('--button-primary-text', selectedTheme.button.primary.text);
    root.style.setProperty('--button-primary-border', selectedTheme.button.primary.border);
    root.style.setProperty('--button-primary-shadow', selectedTheme.button.primary.shadow);

    root.style.setProperty('--button-secondary-background', selectedTheme.button.secondary.background);
    root.style.setProperty('--button-secondary-background-hover', selectedTheme.button.secondary.backgroundHover);
    root.style.setProperty('--button-secondary-text', selectedTheme.button.secondary.text);
    root.style.setProperty('--button-secondary-border', selectedTheme.button.secondary.border);

    root.style.setProperty('--button-ghost-background-hover', selectedTheme.button.ghost.backgroundHover);
    root.style.setProperty('--button-ghost-text', selectedTheme.button.ghost.text);

    root.style.setProperty('--button-destructive-background', selectedTheme.button.destructive.background);
    root.style.setProperty('--button-destructive-background-hover', selectedTheme.button.destructive.backgroundHover);
    root.style.setProperty('--button-destructive-text', selectedTheme.button.destructive.text);
    root.style.setProperty('--button-destructive-border', selectedTheme.button.destructive.border);

    root.style.setProperty('--input-background', selectedTheme.input.background);
    root.style.setProperty('--input-text', selectedTheme.input.text);
    root.style.setProperty('--input-placeholder', selectedTheme.input.placeholder);
    root.style.setProperty('--input-border', selectedTheme.input.border);
    root.style.setProperty('--input-border-hover', selectedTheme.input.borderHover);
    root.style.setProperty('--input-border-focus', selectedTheme.input.borderFocus);
    root.style.setProperty('--input-border-error', selectedTheme.input.borderError);
    root.style.setProperty('--input-focus-ring', selectedTheme.input.focusRing);

    root.style.setProperty('--card-background', selectedTheme.card.background);
    root.style.setProperty('--card-border', selectedTheme.card.border);
    root.style.setProperty('--card-border-hover', selectedTheme.card.borderHover);
    root.style.setProperty('--card-shadow', selectedTheme.card.shadow);
    root.style.setProperty('--card-radius', selectedTheme.card.radius);

    root.style.setProperty('--badge-success-background', selectedTheme.badge.success.background);
    root.style.setProperty('--badge-success-text', selectedTheme.badge.success.text);
    root.style.setProperty('--badge-success-border', selectedTheme.badge.success.border);

    root.style.setProperty('--badge-warning-background', selectedTheme.badge.warning.background);
    root.style.setProperty('--badge-warning-text', selectedTheme.badge.warning.text);
    root.style.setProperty('--badge-warning-border', selectedTheme.badge.warning.border);

    root.style.setProperty('--badge-error-background', selectedTheme.badge.error.background);
    root.style.setProperty('--badge-error-text', selectedTheme.badge.error.text);
    root.style.setProperty('--badge-error-border', selectedTheme.badge.error.border);

    root.style.setProperty('--badge-info-background', selectedTheme.badge.info.background);
    root.style.setProperty('--badge-info-text', selectedTheme.badge.info.text);
    root.style.setProperty('--badge-info-border', selectedTheme.badge.info.border);

    root.style.setProperty('--badge-neutral-background', selectedTheme.badge.neutral.background);
    root.style.setProperty('--badge-neutral-text', selectedTheme.badge.neutral.text);
    root.style.setProperty('--badge-neutral-border', selectedTheme.badge.neutral.border);

    root.style.setProperty('--badge-primary-background', selectedTheme.badge.primary.background);
    root.style.setProperty('--badge-primary-text', selectedTheme.badge.primary.text);
    root.style.setProperty('--badge-primary-border', selectedTheme.badge.primary.border);

    root.style.setProperty('--table-header-background', selectedTheme.table.header.background);
    root.style.setProperty('--table-header-text', selectedTheme.table.header.text);
    root.style.setProperty('--table-header-border', selectedTheme.table.header.border);
    root.style.setProperty('--table-row-background', selectedTheme.table.row.background);
    root.style.setProperty('--table-row-background-hover', selectedTheme.table.row.backgroundHover);
    root.style.setProperty('--table-row-background-selected', selectedTheme.table.row.backgroundSelected);
    root.style.setProperty('--table-row-border', selectedTheme.table.row.border);

    root.style.setProperty('--modal-background', selectedTheme.modal.background);
    root.style.setProperty('--modal-overlay', selectedTheme.modal.overlay);
    root.style.setProperty('--modal-border', selectedTheme.modal.border);
    root.style.setProperty('--modal-shadow', selectedTheme.modal.shadow);
    root.style.setProperty('--modal-radius', selectedTheme.modal.radius);

    root.style.setProperty('--drawer-background', selectedTheme.drawer.background);
    root.style.setProperty('--drawer-border', selectedTheme.drawer.border);
    root.style.setProperty('--drawer-shadow', selectedTheme.drawer.shadow);

    root.style.setProperty('--sidebar-background', selectedTheme.sidebar.background);
    root.style.setProperty('--sidebar-border', selectedTheme.sidebar.border);
    root.style.setProperty('--sidebar-item-background-hover', selectedTheme.sidebar.item.backgroundHover);
    root.style.setProperty('--sidebar-item-background-active', selectedTheme.sidebar.item.backgroundActive);
    root.style.setProperty('--sidebar-item-text', selectedTheme.sidebar.item.text);
    root.style.setProperty('--sidebar-item-text-active', selectedTheme.sidebar.item.textActive);
    root.style.setProperty('--sidebar-item-border-active', selectedTheme.sidebar.item.borderActive);

    root.style.setProperty('--header-background', selectedTheme.header.background);
    root.style.setProperty('--header-border', selectedTheme.header.border);
    root.style.setProperty('--header-text', selectedTheme.header.text);

    root.style.setProperty('--navigation-background', selectedTheme.navigation.background);
    root.style.setProperty('--navigation-item-active', selectedTheme.navigation.itemActive);
    root.style.setProperty('--navigation-item-hover', selectedTheme.navigation.itemHover);
    root.style.setProperty('--navigation-item-inactive', selectedTheme.navigation.itemInactive);
    root.style.setProperty('--navigation-border', selectedTheme.navigation.border);
  };

  useEffect(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {}
    setActiveThemeId(defaultTheme.id);
    setThemeState(defaultTheme);
    applyThemeToDOM(defaultTheme);
    setIsLoaded(true);
  }, []);

  const setTheme = (themeId: string) => {
    const targetTheme = getThemeById(themeId);
    setActiveThemeId(targetTheme.id);
    setThemeState(targetTheme);
    applyThemeToDOM(targetTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, targetTheme.id);
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        activeThemeId,
        availableThemeIds: Object.keys(availableThemes),
        setTheme,
        isLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
