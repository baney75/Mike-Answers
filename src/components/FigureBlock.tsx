import type { FigureSpec } from "../types";

interface FigureBlockProps {
  json: string;
}

export function FigureBlock({ json }: FigureBlockProps) {
  let spec: FigureSpec;
  try {
    spec = JSON.parse(json) as FigureSpec;
  } catch {
    return null;
  }

  if (!spec.type) {
    return null;
  }

  return (
    <section className="my-6 rounded-[1.6rem] border-2 border-gray-900 bg-white p-5 dark:border-gray-100 dark:bg-gray-950 md:p-6">
      {spec.title ? <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{spec.title}</h4> : null}
      {spec.caption ? <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{spec.caption}</p> : null}

      {spec.type === "timeline" && spec.items?.length ? (
        <ol className="mt-5 space-y-4">
          {spec.items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="grid gap-3 md:grid-cols-[auto_1fr]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-900 bg-(--aqs-accent-soft) font-bold text-(--aqs-accent-strong) dark:border-gray-100 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-(--aqs-accent-dark)">
                {index + 1}
              </div>
              <div className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</div>
                {item.detail ? <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{item.detail}</div> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {spec.type === "comparison" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <h5 className="text-sm font-bold uppercase tracking-[0.18em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              {spec.leftTitle ?? "Left"}
            </h5>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-800 dark:text-gray-200">
              {spec.leftItems?.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
          <article className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <h5 className="text-sm font-bold uppercase tracking-[0.18em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              {spec.rightTitle ?? "Right"}
            </h5>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-800 dark:text-gray-200">
              {spec.rightItems?.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
        </div>
      ) : null}

      {spec.type === "process" && spec.steps?.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {spec.steps.map((step, index) => (
            <article key={`${step.title}-${index}`} className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                Step {index + 1}
              </div>
              <div className="mt-2 font-semibold text-gray-900 dark:text-gray-100">{step.title}</div>
              {step.detail ? <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{step.detail}</div> : null}
            </article>
          ))}
        </div>
      ) : null}

      {spec.type === "concept_map" && spec.items?.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {spec.items.map((item) => (
            <div
              key={item.label}
              className="rounded-full border border-gray-900 bg-(--aqs-paper) px-4 py-2 text-sm font-semibold text-gray-900 dark:border-gray-100 dark:bg-gray-900 dark:text-gray-100"
            >
              {item.label}
            </div>
          ))}
        </div>
      ) : null}

      {spec.type === "geometry" && spec.items?.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {spec.items.map((item) => (
            <article key={item.label} className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</div>
              {item.detail ? <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{item.detail}</div> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
