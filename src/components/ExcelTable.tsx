import React from 'react';

export interface ExcelColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface ExcelTableProps<T> {
  columns: ExcelColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  actionsHeader?: string;
  renderActions?: (item: T) => React.ReactNode;
  showIndex?: boolean;
}

export function ExcelTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  onRowClick,
  actionsHeader,
  renderActions,
  showIndex = true,
}: ExcelTableProps<T>) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-300 shadow-xs bg-white">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b-2 border-slate-300 divide-x divide-slate-300">
              {showIndex && (
                <th className="px-2.5 py-2 text-center w-10 font-mono text-[10px] text-slate-500 border border-slate-300 bg-slate-200/70">
                  #
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 border border-slate-300 uppercase tracking-wider text-[11px] font-bold text-slate-800 ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.width || ''}`}
                >
                  {col.header}
                </th>
              ))}
              {renderActions && (
                <th className="px-3 py-2 border border-slate-300 text-center text-[11px] uppercase tracking-wider w-24">
                  {actionsHeader || 'Actions'}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0) + (showIndex ? 1 : 0)}
                  className="px-4 py-8 text-center text-slate-500 italic bg-slate-50 border border-slate-300"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`divide-x divide-slate-300 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                  } ${
                    onRowClick ? 'cursor-pointer hover:bg-emerald-50/60' : 'hover:bg-slate-100/60'
                  }`}
                >
                  {showIndex && (
                    <td className="px-2 py-1.5 text-center font-mono text-[10px] text-slate-500 border border-slate-300 bg-slate-100/40">
                      {idx + 1}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-1.5 border border-slate-300 text-slate-800 text-[11px] ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right font-mono'
                          : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row, idx) : (row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-2 py-1.5 border border-slate-300 text-center">
                      {renderActions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-100 px-3 py-1.5 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-mono">
        <span>Total Rows: {data.length}</span>
        <span className="text-slate-400">Excel Grid Layout</span>
      </div>
    </div>
  );
}
