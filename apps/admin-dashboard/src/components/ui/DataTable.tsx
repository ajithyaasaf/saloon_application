import React from 'react';
import { PaginationMeta } from '@saloon/shared-types';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { AppButton } from './AppButton';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyMessage = 'There are no items matching your criteria.',
  meta,
  onPageChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterSlot,
  actionSlot,
  onRowClick,
}: DataTableProps<T>) {
  const rows: T[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
    ? (data as any).data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {(onSearchChange || filterSlot || actionSlot) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            {onSearchChange && (
              <div style={{ position: 'relative', minWidth: '260px', maxWidth: '380px', flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder={searchPlaceholder}
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  style={{ paddingLeft: '2.25rem', height: '38px' }}
                />
              </div>
            )}
            {filterSlot}
          </div>
          {actionSlot && <div>{actionSlot}</div>}
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={`sk-${col.key}`}>
                      <SkeletonLoader height="1.25rem" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} message={emptyMessage} />
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => (
                <tr
                  key={item.id ? String(item.id) : `row-${idx}`}
                  onClick={() => onRowClick?.(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(item)
                        : (item as any)[col.key] !== undefined
                        ? String((item as any)[col.key])
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && (meta.totalPages > 1 || meta.total > 0) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.25rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Showing{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}
            </span>{' '}
            to{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{' '}
            of{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {meta.total}
            </span>{' '}
            entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AppButton
              variant="secondary"
              size="sm"
              disabled={!meta.hasPreviousPage}
              onClick={() => onPageChange?.(meta.page - 1)}
              leftIcon={<ChevronLeft size={14} />}
            >
              Previous
            </AppButton>
            <span style={{ padding: '0 0.5rem' }}>
              Page {meta.page} of {meta.totalPages || 1}
            </span>
            <AppButton
              variant="secondary"
              size="sm"
              disabled={!meta.hasNextPage}
              onClick={() => onPageChange?.(meta.page + 1)}
              rightIcon={<ChevronRight size={14} />}
            >
              Next
            </AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
