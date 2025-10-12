import { type ReactNode } from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number;
  formatter?: (value: number) => string;
  delta?: number;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

const getDeltaIcon = (delta: number | undefined) => {
  if (typeof delta !== "number") return null;
  if (delta >= 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  return <TrendingDown className="h-4 w-4 text-red-500" />;
};

const getDeltaLabel = (delta: number | undefined) => {
  if (typeof delta !== "number") return null;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${formatPercentage(delta, 1)}`;
};

export const KpiCard = ({ title, value, formatter, delta, loading, className, children }: KpiCardProps) => (
  <Card className={cn("min-h-[132px]", className)}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <>
          <div className="text-2xl font-semibold">
            {formatter ? formatter(value) : value.toLocaleString("es-CL")}
          </div>
          {children ?? null}
        </>
      )}
      {typeof delta === "number" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {getDeltaIcon(delta)}
          <span>{getDeltaLabel(delta)}</span>
          <span>vs prev. period</span>
        </div>
      )}
    </CardContent>
  </Card>
);

export const currencyFormatter = (value: number) => formatCurrency(value, "CLP");
export const percentageFormatter = (value: number) => formatPercentage(value, 2);
