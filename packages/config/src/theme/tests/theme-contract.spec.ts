import { availableThemes, defaultTheme, getThemeById } from '../index.js';
import { verifyThemeCompleteness } from '../validation/completeness.js';
import { generateCSSVariables } from '../css-generator.js';
import { adaptThemeForMobile } from '../mobile-adapter.js';

describe('Theme Contract Completeness & Rebranding Tests', () => {
  const themeIds = Object.keys(availableThemes);

  test('default theme is defined and defaults to luxury-noir', () => {
    expect(defaultTheme).toBeDefined();
    expect(defaultTheme.id).toBe('luxury-noir');
  });

  themeIds.forEach((themeId) => {
    describe(`Theme Contract: ${themeId}`, () => {
      const theme = availableThemes[themeId];

      test('implements full theme contract with zero missing tokens', () => {
        const result = verifyThemeCompleteness(theme);
        if (!result.isValid) {
          console.error(`Theme ${themeId} missing tokens:`, result.missingTokens);
        }
        expect(result.isValid).toBe(true);
        expect(result.missingTokens).toHaveLength(0);
      });

      test('has valid non-empty CSS variables output with zero undefined', () => {
        const css = generateCSSVariables(theme);
        expect(css).toContain(`--theme-id: "${theme.id}";`);
        expect(css).toContain('--color-background-canvas:');
        expect(css).toContain('--button-primary-background:');
        expect(css).toContain('--card-background:');
        expect(css).toContain('--badge-primary-background:');
        expect(css).not.toContain('undefined');
      });

      test('adapts cleanly to mobile React Native token schema', () => {
        const mobileTokens = adaptThemeForMobile(theme);
        expect(mobileTokens.id).toBe(theme.id);
        expect(mobileTokens.colors.background).toBe(theme.color.background.canvas);
        expect(mobileTokens.colors.primary).toBe(theme.color.action.primary);
        expect(mobileTokens.colors.button.primaryBg).toBe(theme.button.primary.background);
        expect(mobileTokens.touchTarget.comfort).toBeGreaterThanOrEqual(44);
        expect(typeof mobileTokens.spacing.md).toBe('number');
        expect(typeof mobileTokens.borderRadius.lg).toBe('number');
      });

      test('all semantic colors have valid color values', () => {
        const bg = theme.color.background;
        expect(bg.canvas).toMatch(/^#|^rgba?\(|^var\(/);
        expect(bg.surface).toMatch(/^#|^rgba?\(|^var\(/);
        expect(bg.elevated).toMatch(/^#|^rgba?\(|^var\(/);

        const text = theme.color.text;
        expect(text.primary).toMatch(/^#|^rgba?\(|^var\(/);
        expect(text.secondary).toMatch(/^#|^rgba?\(|^var\(/);
        expect(text.muted).toMatch(/^#|^rgba?\(|^var\(/);

        const action = theme.color.action;
        expect(action.primary).toMatch(/^#|^rgba?\(|^var\(/);
        expect(action.primaryHover).toMatch(/^#|^rgba?\(|^var\(/);
        expect(action.destructive).toMatch(/^#|^rgba?\(|^var\(/);
      });
    });
  });

  describe('Rebranding Simulation Tests', () => {
    test('switching from luxury-noir to botanical requires zero component changes', () => {
      const initialTheme = getThemeById('luxury-noir');
      const targetTheme = getThemeById('botanical');

      expect(initialTheme.id).toBe('luxury-noir');
      expect(targetTheme.id).toBe('botanical');

      // Both themes expose the exact same semantic interface keys
      expect(Object.keys(initialTheme.color.background)).toEqual(Object.keys(targetTheme.color.background));
      expect(Object.keys(initialTheme.color.text)).toEqual(Object.keys(targetTheme.color.text));
      expect(Object.keys(initialTheme.color.action)).toEqual(Object.keys(targetTheme.color.action));
      expect(Object.keys(initialTheme.button.primary)).toEqual(Object.keys(targetTheme.button.primary));
      expect(Object.keys(initialTheme.badge)).toEqual(Object.keys(targetTheme.badge));
      expect(Object.keys(initialTheme.table)).toEqual(Object.keys(targetTheme.table));
      expect(Object.keys(initialTheme.modal)).toEqual(Object.keys(targetTheme.modal));
      expect(Object.keys(initialTheme.sidebar)).toEqual(Object.keys(targetTheme.sidebar));
    });

    test('switching from luxury-noir to light-minimal preserves token contract', () => {
      const initialTheme = getThemeById('luxury-noir');
      const lightTheme = getThemeById('light-minimal');

      expect(lightTheme.appearance).toBe('light');
      expect(Object.keys(initialTheme.color.background)).toEqual(Object.keys(lightTheme.color.background));
      expect(Object.keys(initialTheme.typography)).toEqual(Object.keys(lightTheme.typography));
      expect(Object.keys(initialTheme.button)).toEqual(Object.keys(lightTheme.button));
    });
  });
});
