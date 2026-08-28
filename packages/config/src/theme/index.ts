export * from './primitives.js';
export * from './tokens.js';
export * from './themes/luxury-noir.js';
export * from './themes/botanical.js';
export * from './themes/light-minimal.js';
export * from './themes/customer-purple.js';
export * from './validation/contrast.js';
export * from './validation/completeness.js';
export * from './css-generator.js';
export * from './mobile-adapter.js';

import { luxuryNoirTheme } from './themes/luxury-noir.js';
import { botanicalTheme } from './themes/botanical.js';
import { lightMinimalTheme } from './themes/light-minimal.js';
import { customerPurpleTheme } from './themes/customer-purple.js';
import { ThemeDefinition } from './tokens.js';

export const availableThemes: Record<string, ThemeDefinition> = {
  'luxury-noir': luxuryNoirTheme,
  botanical: botanicalTheme,
  'light-minimal': lightMinimalTheme,
  'customer-purple': customerPurpleTheme,
};

export const defaultTheme: ThemeDefinition = luxuryNoirTheme;

export function getThemeById(themeId: string): ThemeDefinition {
  return availableThemes[themeId] || defaultTheme;
}
