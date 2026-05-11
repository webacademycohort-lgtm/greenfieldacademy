import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
}

export function DataTable<T extends { id: string }>({ columns, rows, empty }: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-50 text-green-900 border-b-2 border-gold-500">
            {columns.map(c => (
              <th key={String(c.key)} className={`text-left p-3 font-semibold ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500">{empty || 'No records.'}</td></tr>
          ) : rows.map(row => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map(c => (
                <td key={String(c.key)} className={`p-3 ${c.className || ''}`}>
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
