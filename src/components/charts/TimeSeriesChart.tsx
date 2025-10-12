import { Fragment, useEffect, useMemo } from "react";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeseriesPoint } from "@/store/types/dashboard";

interface TimeSeriesChartProps {
  data: TimeseriesPoint[];
  loading?: boolean;
}

export const TimeSeriesChart = ({ data, loading }: TimeSeriesChartProps) => {
  const normalizedData = useMemo(() => {
    return data
      .filter((point) => Number.isFinite(new Date(point.timestamp).getTime()))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [data]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    normalizedData.forEach((point) => {
      Object.keys(point.providers ?? {}).forEach((provider) => set.add(provider));
    });
    return Array.from(set).sort();
  }, [normalizedData]);

  const chartData = useMemo(() => {
    const cumulative = new Map<string, { total: number; authorized: number }>();

    const entries = normalizedData.map((point) => {
      const entry: Record<string, number | string> = {
        timestamp: point.timestamp,
      };

      providers.forEach((provider) => {
        const base = cumulative.get(provider) ?? { total: 0, authorized: 0 };
        const stats = point.providers?.[provider];

        const totalIncrement = stats?.total ?? 0;
        const authorizedIncrement = stats?.authorized ?? 0;

        const totals = {
          total: base.total + totalIncrement,
          authorized: base.authorized + authorizedIncrement,
        };

        cumulative.set(provider, totals);

        entry[`${provider}-total`] = totals.total;
        entry[`${provider}-conversion`] =
          totals.total > 0 ? (totals.authorized / totals.total) * 100 : 0;
      });

      return entry;
    });

    if (entries.length === 0) return entries;

    const firstTimestamp = new Date(entries[0].timestamp as string).getTime();
    let zeroTime = Number.isFinite(firstTimestamp)
      ? firstTimestamp - 60 * 1000
      : Date.now();

    if (Number.isFinite(firstTimestamp) && zeroTime >= firstTimestamp) {
      zeroTime = firstTimestamp - 1;
    }

    const zeroEntry: Record<string, number | string> = {
      timestamp: new Date(zeroTime).toISOString(),
    };
    providers.forEach((provider) => {
      zeroEntry[`${provider}-total`] = 0;
      zeroEntry[`${provider}-conversion`] = 0;
    });

    return [zeroEntry, ...entries];
  }, [normalizedData, providers]);

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
  ];

  const titleCase = (value: string) =>
    value
      .split(/[\s_-]+/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");

  useEffect(() => {
    if (providers.length === 0) {
      console.info("[TimeSeriesChart] No provider breakdown detected", {
        points: normalizedData,
      });
    } else {
      console.info("[TimeSeriesChart] Prepared chart data", {
        providers,
        chartData,
      });
    }
  }, [providers, chartData, normalizedData]);

  return (
    <Card className="col-span-12 lg:col-span-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Payments timeline</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px] pt-4">
      {loading ? (
        <Skeleton className="h-full w-full" />
      ) : normalizedData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No data available in selected range
        </div>
      ) : providers.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Provider breakdown not available for this range
        </div>
      ) : (
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 16, right: 24, bottom: 24, left: 24 }}>
            <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.2} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) =>
                new Date(value).toLocaleString("es-CL", { hour: "2-digit", day: "2-digit" })
              }
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="hsl(var(--muted-foreground))"
              allowDecimals={false}
              tickFormatter={(value) => `${Math.round(value)}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${Math.round(value)}%`}
            />
            <Tooltip
              labelFormatter={(label) =>
                new Date(label).toLocaleString("es-CL", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              }
              formatter={(value, name, props) => {
                const dataKey = typeof props?.dataKey === "string" ? props.dataKey : "";
                if (dataKey.endsWith("-conversion")) {
                  const rate = Number(value ?? 0);
                  return [`${rate.toFixed(1)}%`, name];
                }
                const numeric = Number(value ?? 0);
                return [Math.round(numeric), name];
              }}
            />
            <Legend />
            {providers.map((provider, index) => {
              const color = colors[index % colors.length];
              const label = titleCase(provider);
              return (
                <Fragment key={provider}>
                  <Line
                    type="monotone"
                    dataKey={`${provider}-total`}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    yAxisId="left"
                    name={`${label} · total`}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${provider}-conversion`}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    yAxisId="right"
                    name={`${label} · conversion`}
                  />
                </Fragment>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      )}
      </CardContent>
    </Card>
  );
};
