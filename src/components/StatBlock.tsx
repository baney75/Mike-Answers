import type { StatSpec } from "../types";

interface StatBlockProps {
  json: string;
}

export function StatBlock({ json }: StatBlockProps) {
  let spec: StatSpec;
  try {
    spec = JSON.parse(json) as StatSpec;
  } catch {
    return null;
  }

  if (!Array.isArray(spec.items) || spec.items.length === 0) {
    return null;
  }

  return (
    <section className="my-6 rounded-[1.6rem] border-2 border-gray-900 bg-(--aqs-accent-soft)/60 p-4 dark:border-gray-100 dark:bg-[color:rgba(122,31,52,0.18)] md:p-5">
      {spec.title ? <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{spec.title}</h4> : null}
      {spec.caption ? <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{spec.caption}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {spec.items.map((item) => (
          <article
            key={`${item.label}-${item.value}`}
            className="rounded-[1.25rem] border-2 border-gray-900 bg-white p-4 dark:border-gray-100 dark:bg-gray-950"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">{item.value}</p>
            {item.change ? <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{item.change}</p> : null}
            {item.detail ? <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
