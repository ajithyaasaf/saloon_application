/**
 * FilterOperator — Reserved comparison operators for abstract filter conditions.
 *
 * Architecture ref: Phase 9.1 §2 (FilterUtil)
 */
export type FilterOperator =
  | 'EQ'
  | 'NE'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'BETWEEN'
  | 'IN'
  | 'NOT_IN'
  | 'IS_NULL'
  | 'NOT_NULL';

/**
 * FilterCondition — Abstract representation of a single field comparison condition.
 */
export interface FilterCondition<O extends FilterOperator = FilterOperator, V = unknown> {
  operator: O;
  value?: V;
  gte?: V;
  lte?: V;
  values?: V[];
}

/**
 * FilterDefinition — Framework-agnostic map of entity fields to filter conditions.
 */
export type FilterDefinition<T> = {
  [K in keyof T]?: FilterCondition;
};
