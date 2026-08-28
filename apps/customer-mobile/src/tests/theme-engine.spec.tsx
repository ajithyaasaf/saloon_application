import {
  mobileThemes,
  mobileLuxuryNoirTheme,
  mobileBotanicalTheme,
  mobileLightMinimalTheme,
  defaultMobileTheme,
} from '../theme/mobile-themes';

describe('Customer Mobile Theme Engine & Adaptive Tokens', () => {
  it('initializes with default customer-purple theme and valid colors', () => {
    expect(defaultMobileTheme.id).toBe('customer-purple');
    expect(defaultMobileTheme.appearance).toBe('light');
    expect(defaultMobileTheme.colors.background).toBe('#F8F9FE');
    expect(defaultMobileTheme.colors.primary).toBe('#703EE5');
    expect(defaultMobileTheme.touchTarget.comfort).toBeGreaterThanOrEqual(44);
  });

  it('provides emerald botanical theme with correct semantic mapping', () => {
    const botanical = mobileThemes['botanical'];
    expect(botanical).toBeDefined();
    expect(botanical.id).toBe('botanical');
    expect(botanical.name).toBe('Emerald Botanical');
    expect(botanical.appearance).toBe('dark');
    expect(botanical.colors.background).toBe('#060B09');
    expect(botanical.colors.primary).toBe('#10B981');
    expect(botanical.colors.button.primaryBg).toBe('#10B981');
    expect(botanical.colors.button.primaryText).toBe('#01140E');
  });

  it('provides light-minimal theme with correct light-mode palette', () => {
    const light = mobileThemes['light-minimal'];
    expect(light).toBeDefined();
    expect(light.id).toBe('light-minimal');
    expect(light.name).toBe('Light Minimal / Ivory');
    expect(light.appearance).toBe('light');
    expect(light.colors.background).toBe('#F8FAFC');
    expect(light.colors.textPrimary).toBe('#0F172A');
    expect(light.colors.button.primaryBg).toBe('#111827');
    expect(light.colors.button.primaryText).toBe('#FFFFFF');
  });

  it('guarantees identical schema across all three mobile themes', () => {
    const themes = [mobileLuxuryNoirTheme, mobileBotanicalTheme, mobileLightMinimalTheme];

    themes.forEach((theme) => {
      expect(typeof theme.colors.background).toBe('string');
      expect(typeof theme.colors.surface).toBe('string');
      expect(typeof theme.colors.textPrimary).toBe('string');
      expect(typeof theme.colors.button.primaryBg).toBe('string');
      expect(typeof theme.colors.button.primaryText).toBe('string');
      expect(typeof theme.colors.tabBar.bg).toBe('string');
      expect(typeof theme.colors.tabBar.active).toBe('string');
      expect(typeof theme.colors.tabBar.inactive).toBe('string');
      expect(typeof theme.spacing.md).toBe('number');
      expect(typeof theme.borderRadius.lg).toBe('number');
      expect(theme.touchTarget.comfort).toBe(48);
    });
  });
});
