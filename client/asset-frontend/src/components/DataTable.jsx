import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  sortBy = '',
  sortOrder = 'desc',
  onSort = () => {},
  pagination = null,
  onPageChange = () => {},
  emptyMessage = 'No records found.',
  borderless = false,
}) => {
  
  const handleSort = (key, sortable) => {
    if (!sortable) return;
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    onSort(key, newOrder);
  };

  return (
    <div className="flex flex-col w-full overflow-hidden" style={borderless ? { background: 'transparent' } : { background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: '6px' }}>
      {/* Table container */}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead className="text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`px-6 py-3 select-none ${col.sortable ? 'cursor-pointer' : ''}`}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {sortBy !== col.key ? (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        ) : sortOrder === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {loading ? (
              // Skeleton Loader Rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id || row._id || rIdx}
                  className="transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-3.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {col.render ? col.render(row) : row[col.key] || '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span> to{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{pagination.total}</span> assets
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1 border hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-1 border hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
