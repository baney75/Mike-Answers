import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

/**
 * Expected JSON format inside ```chart code blocks:
 * {
 *   "type": "line" | "bar",
 *   "title": "...",
 *   "xLabel": "...",
 *   "yLabel": "...",
 *   "data": [{ "x": 0, "y": 10 }, ...]
 * }
 */
interface ChartData {
  type: "line" | "bar" | "area" | "scatter";
  title?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
  xKey?: string;
  series?: Array<{
    key: string;
    label?: string;
    color?: string;
  }>;
  xDomain?: Array<number | "auto" | "dataMin" | "dataMax">;
  yDomain?: Array<number | "auto" | "dataMin" | "dataMax">;
  showLegend?: boolean;
  data: Record<string, number | string>[];
}

interface ChartBlockProps {
  json: string;
}

export function ChartBlock({ json }: ChartBlockProps) {
  let chart: ChartData;
  try {
    chart = JSON.parse(json);
  } catch {
    return (
      <div className="p-4 my-4 rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm font-mono">
        Invalid chart data
      </div>
    );
  }

  if (!Array.isArray(chart.data) || chart.data.length === 0) {
    return (
      <div className="my-4 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-sm font-mono text-red-800 dark:bg-red-900/20 dark:text-red-200">
        Chart data is empty
      </div>
    );
  }

  const xKey = chart.xKey ?? "x";
  const dataKeys = Object.keys(chart.data[0] ?? {}).filter((key) => key !== xKey);
  const palette = ["#7a1f34", "#b4536f", "#d9913a", "#355070", "#6d597a"];
  const series =
    chart.series?.filter((entry) => dataKeys.includes(entry.key)) ??
    dataKeys.map((key, index) => ({
      key,
      label: key === "y" ? chart.yLabel || "Value" : key,
      color: palette[index % palette.length],
    }));

  const showLegend = chart.showLegend ?? series.length > 1;
  const showDots = chart.data.length <= 32;
  const hasNumericX = chart.data.some((row) => typeof row[xKey] === "number");

  const formatNumber = (value: unknown) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return String(value ?? "");
    }

    if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) {
      return value.toExponential(2);
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
  };

  const axisDomain = (
    input?: Array<number | "auto" | "dataMin" | "dataMax">,
  ) => (input && input.length === 2 ? [input[0], input[1]] : undefined);

  const xDomain = hasNumericX ? (axisDomain(chart.xDomain) as [number | string, number | string] | undefined) : undefined;
  const yDomain = axisDomain(chart.yDomain) as [number | string, number | string] | undefined;

  const sharedXAxisProps = {
    dataKey: xKey,
    tickLine: false,
    axisLine: { stroke: "#334155", strokeWidth: 1.5 },
    tick: { fill: "#64748b", fontSize: 12 },
    label: chart.xLabel ? { value: chart.xLabel, position: "insideBottom" as const, offset: -4 } : undefined,
  };

  const sharedYAxisProps = {
    tickLine: false,
    axisLine: { stroke: "#334155", strokeWidth: 1.5 },
    tick: { fill: "#64748b", fontSize: 12 },
    tickFormatter: formatNumber,
    label: chart.yLabel ? { value: chart.yLabel, angle: -90, position: "insideLeft" as const } : undefined,
  };

  const renderReferenceLines = () => (
    <>
      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
      {hasNumericX ? <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" /> : null}
    </>
  );

  const renderLegend = () => (showLegend ? <Legend wrapperStyle={{ paddingTop: 12 }} /> : null);

  return (
    <div className="my-6 rounded-[1.6rem] border-2 border-gray-900 bg-white p-4 neo-shadow-sm dark:border-gray-100 dark:bg-gray-900 md:p-5">
      {chart.title && (
        <h4 className="mb-2 text-center text-lg font-bold text-gray-900 dark:text-gray-100">
          {chart.title}
        </h4>
      )}
      {chart.description ? (
        <p className="mx-auto mb-4 max-w-2xl text-center text-sm leading-6 text-gray-600 dark:text-gray-300">
          {chart.description}
        </p>
      ) : null}
      <ResponsiveContainer width="100%" height={340}>
        {chart.type === "bar" ? (
          <BarChart data={chart.data}>
            <CartesianGrid stroke="#cbd5e1" strokeDasharray="4 4" vertical={false} />
            <XAxis {...sharedXAxisProps} domain={xDomain} />
            <YAxis {...sharedYAxisProps} domain={yDomain} />
            <Tooltip
              formatter={(value: unknown, name: string) => [formatNumber(value), name]}
              contentStyle={{ borderRadius: 16, borderWidth: 2, borderColor: "#0f172a" }}
            />
            {renderLegend()}
            {renderReferenceLines()}
            {series.map((entry, index) => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label || entry.key}
                fill={entry.color || palette[index % palette.length]}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        ) : chart.type === "area" ? (
          <AreaChart data={chart.data}>
            <CartesianGrid stroke="#cbd5e1" strokeDasharray="4 4" vertical={false} />
            <XAxis {...sharedXAxisProps} domain={xDomain} />
            <YAxis {...sharedYAxisProps} domain={yDomain} />
            <Tooltip
              formatter={(value: unknown, name: string) => [formatNumber(value), name]}
              contentStyle={{ borderRadius: 16, borderWidth: 2, borderColor: "#0f172a" }}
            />
            {renderLegend()}
            {renderReferenceLines()}
            {series.map((entry, index) => (
              <Area
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label || entry.key}
                stroke={entry.color || palette[index % palette.length]}
                fill={entry.color || palette[index % palette.length]}
                fillOpacity={0.18}
                strokeWidth={3}
              />
            ))}
          </AreaChart>
        ) : chart.type === "scatter" ? (
          <ScatterChart data={chart.data}>
            <CartesianGrid stroke="#cbd5e1" strokeDasharray="4 4" vertical={false} />
            <XAxis {...sharedXAxisProps} domain={xDomain} />
            <YAxis {...sharedYAxisProps} domain={yDomain} />
            <Tooltip
              formatter={(value: unknown, name: string) => [formatNumber(value), name]}
              contentStyle={{ borderRadius: 16, borderWidth: 2, borderColor: "#0f172a" }}
            />
            {renderLegend()}
            {renderReferenceLines()}
            {series.map((entry, index) => (
              <Scatter
                key={entry.key}
                data={chart.data}
                dataKey={entry.key}
                name={entry.label || entry.key}
                fill={entry.color || palette[index % palette.length]}
              />
            ))}
          </ScatterChart>
        ) : (
          <LineChart data={chart.data}>
            <CartesianGrid stroke="#cbd5e1" strokeDasharray="4 4" vertical={false} />
            <XAxis {...sharedXAxisProps} domain={xDomain} />
            <YAxis {...sharedYAxisProps} domain={yDomain} />
            <Tooltip
              formatter={(value: unknown, name: string) => [formatNumber(value), name]}
              contentStyle={{ borderRadius: 16, borderWidth: 2, borderColor: "#0f172a" }}
            />
            {renderLegend()}
            {renderReferenceLines()}
            {series.map((entry, index) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label || entry.key}
                stroke={entry.color || palette[index % palette.length]}
                strokeWidth={3}
                dot={showDots ? { r: 2.5, strokeWidth: 1.5 } : false}
                activeDot={{ r: 4.5 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
