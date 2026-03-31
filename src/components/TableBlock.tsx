interface TableBlockProps {
  json: string;
}

interface TableSpec {
  title?: string;
  caption?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export function TableBlock({ json }: TableBlockProps) {
  let spec: TableSpec;
  try {
    spec = JSON.parse(json) as TableSpec;
  } catch {
    return null;
  }

  if (!spec.columns?.length || !spec.rows?.length) {
    return null;
  }

  return (
    <section className="my-6 overflow-hidden rounded-[1.6rem] border-2 border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-950">
      <div className="border-b border-gray-200 bg-[var(--aqs-accent-soft)]/50 px-5 py-4 dark:border-gray-800 dark:bg-[color:rgba(122,31,52,0.16)]">
        {spec.title ? <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{spec.title}</h4> : null}
        {spec.caption ? <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">{spec.caption}</p> : null}
      </div>
      <div className="scroll-panel overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {spec.columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-gray-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-gray-600 dark:border-gray-800 dark:text-gray-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, index) => (
              <tr key={`${index}-${row.join("-")}`} className="odd:bg-white even:bg-gray-50/70 dark:odd:bg-gray-950 dark:even:bg-gray-900">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${index}-${cellIndex}`}
                    className="border-b border-gray-200 px-4 py-3 text-sm leading-6 text-gray-800 dark:border-gray-800 dark:text-gray-200"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
