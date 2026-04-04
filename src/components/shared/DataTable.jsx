import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DataTable({ columns, data, loading, emptyMessage = "No data found", onRowClick }) {
  if (loading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
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
      <div className="rounded-xl border p-12 text-center" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
      <table className="w-full">
        <thead className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider", col.className)}>
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
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, j) => (
                <td key={j} className={cn("px-4 py-3 text-sm text-slate-300", col.cellClassName)}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}