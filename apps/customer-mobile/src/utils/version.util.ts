/**
 * Robust integer-based Semantic Version comparator.
 *
 * Compares two semantic version strings (e.g., "2.10.0" vs "2.9.0").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *
 * Prevents naive string ordering bugs where "2.10.0" < "2.9.0".
 */
export function compareSemver(v1: string | null | undefined, v2: string | null | undefined): number {
  if (!v1 || !v2) return 0;

  const parse = (v: string): number[] => {
    const clean = v.split('-')[0].split('+')[0].trim();
    const parts = clean.split('.').map((p) => {
      const num = parseInt(p, 10);
      return isNaN(num) ? 0 : num;
    });
    while (parts.length < 3) parts.push(0);
    return parts.slice(0, 3);
  };

  const p1 = parse(v1);
  const p2 = parse(v2);

  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}
