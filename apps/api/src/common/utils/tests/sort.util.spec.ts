import { SortUtil } from '../sort.util';

interface TestEntity {
  name: string;
  createdAt: Date;
  price: number;
}

describe('SortUtil', () => {
  const allowed: (keyof TestEntity)[] = ['name', 'createdAt', 'price'];

  describe('buildSortDefinitions() Fault Tolerance & Edge Cases', () => {
    it('should return requested sort definition when field is allowlisted and freeze output', () => {
      const sort = SortUtil.buildSortDefinitions<TestEntity>('price', 'asc', allowed, 'createdAt');

      expect(sort).toEqual([
        {
          field: 'price',
          direction: 'asc',
        },
      ]);
      expect(Object.isFrozen(sort)).toBe(true);
      expect(Object.isFrozen(sort[0])).toBe(true);
    });

    it('should fall back to defaultField when unsupported/unallowed sort field is supplied (never throws)', () => {
      const sort = SortUtil.buildSortDefinitions<TestEntity>('unsupportedField', 'asc', allowed, 'createdAt', 'desc');

      expect(sort).toEqual([
        {
          field: 'createdAt',
          direction: 'desc',
        },
      ]);
    });

    it('should support nulls ordering specification', () => {
      const sort = SortUtil.buildSortDefinitions<TestEntity>('price', 'asc', allowed, 'createdAt', 'desc', 'last');

      expect(sort[0].nulls).toBe('last');
    });
  });
});
