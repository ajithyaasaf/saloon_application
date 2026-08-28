import React, { createContext, useContext, useState } from 'react';
import { MobileThemeTokens } from '@saloon/config';
import { mobileThemes, defaultMobileTheme } from './mobile-themes';

interface MobileThemeContextType {
  theme: MobileThemeTokens;
  activeThemeId: string;
  availableThemeIds: string[];
  setTheme: (themeId: string) => void;
  colors: MobileThemeTokens['colors'];
  typography: MobileThemeTokens['typography'];
  spacing: MobileThemeTokens['spacing'];
  borderRadius: MobileThemeTokens['borderRadius'];
  touchTarget: MobileThemeTokens['touchTarget'];
}

const MobileThemeContext = createContext<MobileThemeContextType>({
  theme: defaultMobileTheme,
  activeThemeId: defaultMobileTheme.id,
  availableThemeIds: Object.keys(mobileThemes),
  setTheme: () => {},
  colors: defaultMobileTheme.colors,
  typography: defaultMobileTheme.typography,
  spacing: defaultMobileTheme.spacing,
  borderRadius: defaultMobileTheme.borderRadius,
  touchTarget: defaultMobileTheme.touchTarget,
});

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultThemeId?: string;
}> = ({ children, defaultThemeId = 'customer-purple' }) => {
  const [activeThemeId, setActiveThemeId] = useState<string>(defaultThemeId);
  const [theme, setThemeState] = useState<MobileThemeTokens>(
    mobileThemes[defaultThemeId] || defaultMobileTheme
  );

  const setTheme = (themeId: string) => {
    const selected = mobileThemes[themeId] || defaultMobileTheme;
    setActiveThemeId(selected.id);
    setThemeState(selected);
  };

  return (
    <MobileThemeContext.Provider
      value={{
        theme,
        activeThemeId,
        availableThemeIds: Object.keys(mobileThemes),
        setTheme,
        colors: theme.colors,
        typography: theme.typography,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius,
        touchTarget: theme.touchTarget,
      }}
    >
      {children}
    </MobileThemeContext.Provider>
  );
};

export const useTheme = (): MobileThemeContextType => useContext(MobileThemeContext);
