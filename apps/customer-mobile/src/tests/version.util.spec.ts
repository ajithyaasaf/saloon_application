import { compareSemver } from '../utils/version.util';

describe('Mobile version.util - compareSemver', () => {
  it('should correctly evaluate major, minor, and patch ordering', () => {
    expect(compareSemver('2.10.0', '2.9.0')).toBe(1); // Numeric comparison check!
    expect(compareSemver('2.9.0', '2.10.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('3.0.0', '2.99.99')).toBe(1);
    expect(compareSemver('1.2.3', '1.2.4')).toBe(-1);
  });

  it('should ignore build metadata and pre-release tags', () => {
    expect(compareSemver('1.0.0-beta.1', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.1+build.42', '1.0.0')).toBe(1);
  });

  it('should handle missing, empty, or null arguments gracefully without crashing', () => {
    expect(compareSemver(null, '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', undefined)).toBe(0);
    expect(compareSemver('', '')).toBe(0);
  });
});
