/**
 * Mathematical WCAG 2.1 Contrast Engine
 * 
 * Computes exact relative luminance and contrast ratios between foreground and background colors.
 */

export function sRGBToLinear(c: number): number {
  const norm = c / 255;
  if (norm <= 0.04045) {
    return norm / 12.92;
  }
  return Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function parseColorToRGB(colorStr: string): { r: number; g: number; b: number } {
  const cleaned = colorStr.trim();

  // HEX
  if (cleaned.startsWith('#')) {
    let hex = cleaned.substring(1);
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('');
    } else if (hex.length === 8) {
      hex = hex.substring(0, 6);
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }

  // RGB / RGBA
  const rgbMatch = cleaned.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  throw new Error(`Unsupported color format for WCAG calculation: "${colorStr}"`);
}

export function calculateRelativeLuminance(colorStr: string): number {
  const { r, g, b } = parseColorToRGB(colorStr);
  const rLin = sRGBToLinear(r);
  const gLin = sRGBToLinear(g);
  const bLin = sRGBToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function calculateContrastRatio(fgColor: string, bgColor: string): number {
  const lum1 = calculateRelativeLuminance(fgColor);
  const lum2 = calculateRelativeLuminance(bgColor);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export interface ContrastCheckResult {
  themeId: string;
  tokenName: string;
  fgColor: string;
  bgColor: string;
  calculatedRatio: number;
  requiredRatio: number;
  passes: boolean;
  level: 'AA_NORMAL' | 'AA_LARGE' | 'AAA' | 'UI_COMPONENT';
  failureReason?: string;
}

export function verifyContrast(
  themeId: string,
  tokenName: string,
  fgColor: string,
  bgColor: string,
  level: 'AA_NORMAL' | 'AA_LARGE' | 'AAA' | 'UI_COMPONENT' = 'AA_NORMAL'
): ContrastCheckResult {
  const calculatedRatio = calculateContrastRatio(fgColor, bgColor);
  let requiredRatio = 4.5;
  if (level === 'AA_LARGE' || level === 'UI_COMPONENT') {
    requiredRatio = 3.0;
  } else if (level === 'AAA') {
    requiredRatio = 7.0;
  }

  const passes = calculatedRatio >= requiredRatio;
  return {
    themeId,
    tokenName,
    fgColor,
    bgColor,
    calculatedRatio: parseFloat(calculatedRatio.toFixed(2)),
    requiredRatio,
    passes,
    level,
    failureReason: passes
      ? undefined
      : `Failed ${level} contrast requirement: calculated ${calculatedRatio.toFixed(2)}:1, required >= ${requiredRatio}:1 (fg: ${fgColor}, bg: ${bgColor})`,
  };
}
