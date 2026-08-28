import { SearchUtil } from '../search.util';

interface TestEntity {
  name: string;
  description: string;
  email: string;
}

describe('SearchUtil', () => {
  describe('sanitizeSearchTerm() Edge Cases', () => {
    it('should sanitize raw terms by normalizing spaces and stripping control characters while preserving unicode and emoji', () => {
      expect(SearchUtil.sanitizeSearchTerm('  glamour   salon  ')).toBe('glamour salon');
      expect(SearchUtil.sanitizeSearchTerm('test\x00term')).toBe('testterm');
      expect(SearchUtil.sanitizeSearchTerm('✨ Glamour Salon ✨')).toBe('✨ Glamour Salon ✨');
      expect(SearchUtil.sanitizeSearchTerm('   ')).toBe('');
    });
  });

  describe('buildSearchDefinition() Edge Cases', () => {
    const fields: (keyof TestEntity)[] = ['name', 'description'];

    it('should build abstract SearchDefinition with default CONTAINS mode and frozen outputs', () => {
      const def = SearchUtil.buildSearchDefinition('hair cut', fields);

      expect(def).toEqual({
        term: 'hair cut',
        fields,
        mode: 'CONTAINS',
        minimumTermLength: 1,
      });
      expect(Object.isFrozen(def)).toBe(true);
      expect(Object.isFrozen(def?.fields)).toBe(true);
    });

    it('should handle whitespace-only search term gracefully', () => {
      expect(SearchUtil.buildSearchDefinition('   ', fields)).toBeUndefined();
    });

    it('should enforce minimumTermLength requirement', () => {
      expect(SearchUtil.buildSearchDefinition('ab', fields, 'CONTAINS', 3)).toBeUndefined();
      expect(SearchUtil.buildSearchDefinition('abc', fields, 'CONTAINS', 3)).toBeDefined();
    });
  });
});
