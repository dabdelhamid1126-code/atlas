import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DataTable({ columns, data, loading, emptyMessage = "No data found", onRowClick }) {
  if (loading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--parch-card)', borderColor: 'var(--parch-line)' }}>
        <table className="w-full">
          <thead className="border-b" style={{ borderColor: 'var(--parch-line)', background: 'var(--parch-warm)' }}>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faded)' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b" style={{ borderColor: 'var(--parch-line)' }}>
                {columns.map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--parch-card)', borderColor: 'var(--parch-line)' }}>
        <p style={{ color: 'var(--ink-faded)' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--parch-card)', borderColor: 'var(--parch-line)', minWidth: 600 }}>
      <table className="w-full">
        <thead className="border-b" style={{ borderColor: 'var(--parch-line)', background: 'var(--parch-warm)' }}>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", col.className)} style={{ color: 'var(--ink-faded)' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={cn("border-b transition-colors", onRowClick && "cursor-pointer")}
              style={{ borderColor: 'var(--parch-line)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--parch-warm)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, j) => (
                <td key={j} className={cn("px-4 py-3 text-sm", col.cellClassName)} style={{ color: 'var(--ink)' }}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}