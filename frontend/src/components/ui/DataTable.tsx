import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key:       string
  header:    string
  render:    (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns:   Column<T>[]
  data:      T[]
  rowKey:    (row: T) => string
  footer?:   ReactNode
  emptyMsg?: string
}

export default function DataTable<T>({ columns, data, rowKey, footer, emptyMsg }: DataTableProps<T>) {
  return (
    <div className="fanos-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/10 border-b border-white/[0.05]">
              {columns.map(c => (
                <th key={c.key}
                  className={cn('px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[11px] text-fanos-dim">{emptyMsg ?? 'No data found.'}</td></tr>
            ) : (
              data.map(row => (
                <tr key={rowKey(row)} className="hover:bg-white/[0.018] transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className={cn('px-3 py-2.5', c.className)}>{c.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  )
}
