'use client';

import React from 'react';
import { EmptyState } from './EmptyState.js';
import { Button } from './Button.js';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  onRowClick?: (item: T) => void;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyMessage = 'There are no items matching your current filters or criteria.',
  emptyActionText,
  onEmptyAction,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterSlot,
  actionSlot,
  onRowClick,
  currentPage = 1,
  totalPages = 1,
  pageSize,
  totalItems,
  onPageChange,
}: DataTableProps<T>) {
  const rows: T[] = Array.isArray(data) ? data : [];

  return (
    <div className="data-table-wrapper">
      {/* Table Toolbar */}
      {(onSearchChange || filterSlot || actionSlot) && (
        <div className="data-table-toolbar">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            {onSearchChange && (
              <div className="data-table-search">
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            )}
            {filterSlot}
          </div>
          {actionSlot && <div>{actionSlot}</div>}
        </div>
      )}

      {/* Table Scroll Surface */}
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={
                    col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : undefined
                  }
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading Shimmer Skeletons
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  {columns.map((col, cIdx) => (
                    <td key={`c-${cIdx}`}>
                      <div
                        style={{
                          height: '18px',
                          width: cIdx === 0 ? '70%' : '45%',
                          background: 'var(--color-border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyMessage}
                    actionText={emptyActionText}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr
                  key={row.id ? String(row.id) : `row-${rIdx}`}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td
                      key={`${row.id || rIdx}-${col.key}`}
                      className={
                        col.align === 'right'
                          ? 'align-right'
                          : col.align === 'center'
                          ? 'align-center'
                          : undefined
                      }
                    >
                      {col.render ? col.render(row, rIdx) : (row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Bar */}
      {totalPages > 1 && onPageChange && (
        <div className="data-table-pagination">
          <div>
            {totalItems !== undefined && pageSize !== undefined ? (
              <span>
                Showing{' '}
                <strong>
                  {Math.min((currentPage - 1) * pageSize + 1, totalItems)} –{' '}
                  {Math.min(currentPage * pageSize, totalItems)}
                </strong>{' '}
                of <strong>{totalItems}</strong> entries
              </span>
            ) : (
              <span>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft size={14} />}
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight size={14} />}
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
