import { calculateContrastRatio, verifyContrast, sRGBToLinear, calculateRelativeLuminance } from '../validation/contrast.js';
import { luxuryNoirTheme } from '../themes/luxury-noir.js';
import { botanicalTheme } from '../themes/botanical.js';
import { lightMinimalTheme } from '../themes/light-minimal.js';

describe('WCAG 2.1 Contrast Engine & Mathematical Verification', () => {
  test('sRGB to linear conversion conforms to WCAG formula', () => {
    expect(sRGBToLinear(0)).toBe(0);
    expect(sRGBToLinear(255)).toBe(1);
    expect(sRGBToLinear(128)).toBeCloseTo(0.21586, 4);
  });

  test('relative luminance calculation is mathematically accurate', () => {
    expect(calculateRelativeLuminance('#FFFFFF')).toBeCloseTo(1.0, 4);
    expect(calculateRelativeLuminance('#000000')).toBeCloseTo(0.0, 4);
    expect(calculateContrastRatio('#FFFFFF', '#000000')).toBe(21);
  });

  describe('Theme: Luxury Noir & Gold Contrast Verification', () => {
    test('primary text on canvas background meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'text.primary on bg.canvas',
        luxuryNoirTheme.color.text.primary,
        luxuryNoirTheme.color.background.canvas,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('primary text on card surface meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'text.primary on bg.surface',
        luxuryNoirTheme.color.text.primary,
        luxuryNoirTheme.color.background.surface,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('secondary text on card surface meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'text.secondary on bg.surface',
        luxuryNoirTheme.color.text.secondary,
        luxuryNoirTheme.color.background.surface,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('muted text on card surface meets WCAG AA Normal Text (>= 4.5:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'text.muted on bg.surface',
        luxuryNoirTheme.color.text.muted,
        luxuryNoirTheme.color.background.surface,
        'AA_NORMAL'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('primary button text on gold CTA background meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'button.primary.text on button.primary.background',
        luxuryNoirTheme.button.primary.text,
        luxuryNoirTheme.button.primary.background,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('primary button hover text on gold hover background meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'button.primary.text on button.primary.backgroundHover',
        luxuryNoirTheme.button.primary.text,
        luxuryNoirTheme.button.primary.backgroundHover,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('success status text on card surface meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'status.success on bg.surface',
        luxuryNoirTheme.color.status.success,
        luxuryNoirTheme.color.background.surface,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('error status text on card surface meets WCAG AA Normal Text (>= 4.5:1)', () => {
      const res = verifyContrast(
        luxuryNoirTheme.id,
        'status.error on bg.surface',
        luxuryNoirTheme.color.status.error,
        luxuryNoirTheme.color.background.surface,
        'AA_NORMAL'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Theme: Emerald Botanical Contrast Verification', () => {
    test('primary text on botanical canvas meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        botanicalTheme.id,
        'text.primary on bg.canvas',
        botanicalTheme.color.text.primary,
        botanicalTheme.color.background.canvas,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('primary text on botanical surface meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        botanicalTheme.id,
        'text.primary on bg.surface',
        botanicalTheme.color.text.primary,
        botanicalTheme.color.background.surface,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('muted text on botanical surface meets WCAG AA (>= 4.5:1)', () => {
      const res = verifyContrast(
        botanicalTheme.id,
        'text.muted on bg.surface',
        botanicalTheme.color.text.muted,
        botanicalTheme.color.background.surface,
        'AA_NORMAL'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('primary button text on emerald background meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        botanicalTheme.id,
        'button.primary.text on button.primary.background',
        botanicalTheme.button.primary.text,
        botanicalTheme.button.primary.background,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe('Theme: Light Minimal / Ivory Contrast Verification', () => {
    test('primary text on light canvas meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        lightMinimalTheme.id,
        'text.primary on bg.canvas',
        lightMinimalTheme.color.text.primary,
        lightMinimalTheme.color.background.canvas,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('primary text on light surface meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        lightMinimalTheme.id,
        'text.primary on bg.surface',
        lightMinimalTheme.color.text.primary,
        lightMinimalTheme.color.background.surface,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('secondary text on light surface meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        lightMinimalTheme.id,
        'text.secondary on bg.surface',
        lightMinimalTheme.color.text.secondary,
        lightMinimalTheme.color.background.surface,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });

    test('muted text on light surface meets WCAG AA (>= 4.5:1)', () => {
      const res = verifyContrast(
        lightMinimalTheme.id,
        'text.muted on bg.surface',
        lightMinimalTheme.color.text.muted,
        lightMinimalTheme.color.background.surface,
        'AA_NORMAL'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('primary button text on charcoal background meets WCAG AAA (>= 7:1)', () => {
      const res = verifyContrast(
        lightMinimalTheme.id,
        'button.primary.text on button.primary.background',
        lightMinimalTheme.button.primary.text,
        lightMinimalTheme.button.primary.background,
        'AAA'
      );
      expect(res.passes).toBe(true);
      expect(res.calculatedRatio).toBeGreaterThanOrEqual(7.0);
    });
  });
});
