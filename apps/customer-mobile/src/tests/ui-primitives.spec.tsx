import { colors, spacing, typography, borderRadius, touchTarget } from '../theme/index';

describe('Customer Mobile Theme & Design Tokens', () => {
  it('should define royal purple and soft lavender color palette', () => {
    expect(colors.background).toBe('#F8F9FE');
    expect(colors.primary).toBe('#703EE5');
    expect(colors.textPrimary).toBe('#181A20');
    expect(colors.button.primaryBg).toBe('#703EE5');
    expect(colors.button.primaryText).toBe('#FFFFFF');
  });

  it('should define consistent typography hierarchy', () => {
    expect(typography.display.fontSize).toBe(28);
    expect(typography.heading1.fontSize).toBe(22);
    expect(typography.heading2.fontSize).toBe(18);
    expect(typography.body.fontSize).toBe(15);
    expect(typography.caption.fontSize).toBe(13);
  });

  it('should define 4px modular spacing grid, corner radiuses and touch targets', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    expect(spacing.lg).toBe(16);
    expect(spacing.xl).toBe(20);
    expect(borderRadius.md).toBe(12);
    expect(borderRadius.full).toBe(9999);
    expect(touchTarget.comfort).toBe(48);
  });
});
