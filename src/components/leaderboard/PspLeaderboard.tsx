import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { MetricsPayload } from "@/store/types/dashboard";

interface PspLeaderboardProps {
  metrics: MetricsPayload | null;
  loading?: boolean;
}

export const PspLeaderboard = ({ metrics, loading }: PspLeaderboardProps) => {
  const fallbackCurrency = metrics?.totalAmountCurrency ?? "CLP";

  const totalsByCurrency = metrics?.pspDistribution.reduce<Record<string, number>>((acc, item) => {
    const currencyKey = (item.currency ?? fallbackCurrency ?? "CLP").toUpperCase();
    acc[currencyKey] = (acc[currencyKey] ?? 0) + item.totalAmountMinor;
    return acc;
  }, {});

  return (
    <Card className="col-span-12 lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Top PSPs</CardTitle>
        <Trophy className="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : !metrics ? (
        <div className="text-sm text-muted-foreground">No metrics available</div>
      ) : (
        <ul className="space-y-3">
          {metrics.pspDistribution.map((item) => {
            const itemCurrency = (item.currency ?? fallbackCurrency ?? "CLP").toUpperCase();
            const currencyTotal = totalsByCurrency?.[itemCurrency] ?? 0;
            const share = currencyTotal ? (item.totalAmountMinor / currencyTotal) * 100 : 0;
            const amountLabel = formatCurrency(
              item.totalAmountMinor,
              item.currency ?? fallbackCurrency,
            );
            return (
              <li
                key={item.provider}
                className="flex items-center justify-between rounded-md border border-border/60 bg-card/60 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium capitalize">{item.provider}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.count} payments · {formatPercentage(share, 1)} share
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {amountLabel}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardContent>
    </Card>
  );
};
