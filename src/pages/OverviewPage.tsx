import { useMemo } from "react";

import { KpiCard, percentageFormatter } from "@/components/cards/KpiCard";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { PspLeaderboard } from "@/components/leaderboard/PspLeaderboard";
import { formatCurrency } from "@/lib/utils";
import type { MetricsPayload, ProviderType, TimeseriesPoint } from "@/store/types/dashboard";

interface OverviewPageProps {
  metrics: MetricsPayload | null;
  loading: boolean;
  timeseries: TimeseriesPoint[];
  totalsByCurrency: { currency: string; amountMinor: number; providers?: Record<string, number> }[];
  statusCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  providerAmounts: Record<string, number>;
  providerPaymentDetails: Record<string, { id: string; amountMinor: number; currency: string }[]>;
}

const ALL_STATUSES = [
  "PENDING",
  "AUTHORIZED",
  "FAILED",
  "CANCELED",
  "REFUNDED",
  "TO_CONFIRM",
  "ABANDONED",
] as const;

export const OverviewPage = ({
  metrics,
  loading,
  timeseries,
  totalsByCurrency,
  statusCounts,
  providerCounts,
  providerAmounts,
  providerPaymentDetails,
}: OverviewPageProps) => {
  const providerCurrencyMap = useMemo(() => {
    const map: Record<string, string> = {};
    metrics?.pspDistribution?.forEach((item) => {
      if (item.currency) {
        map[item.provider] = item.currency;
      }
    });
    return map;
  }, [metrics?.pspDistribution]);

  const statusCountsTotal = useMemo(() => {
    return Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  }, [statusCounts]);

  const statusCountsAuthorized = useMemo(() => {
    return statusCounts["AUTHORIZED"] ?? 0;
  }, [statusCounts]);

  const timeseriesAggregates = useMemo(() => {
    return timeseries.reduce(
      (acc, point) => {
        const count = Number.isFinite(point.count) ? point.count : 0;
        const successRate = Number.isFinite(point.successRate) ? point.successRate : 0;

        acc.total += count;
        acc.authorized += (count * successRate) / 100;

        return acc;
      },
      { total: 0, authorized: 0 },
    );
  }, [timeseries]);

  const totalPaymentsValue = useMemo(() => {
    if (timeseriesAggregates.total > 0) {
      return timeseriesAggregates.total;
    }

    if (statusCountsTotal > 0) {
      return statusCountsTotal;
    }

    return metrics?.totalPayments ?? 0;
  }, [metrics?.totalPayments, statusCountsTotal, timeseriesAggregates.total]);

  const successRateValue = useMemo(() => {
    if (timeseriesAggregates.total > 0) {
      const successRate = (timeseriesAggregates.authorized / timeseriesAggregates.total) * 100;
      return Number.isFinite(successRate) ? successRate : metrics?.successRate ?? 0;
    }

    if (statusCountsTotal > 0) {
      const successRate = (statusCountsAuthorized / statusCountsTotal) * 100;
      return Number.isFinite(successRate) ? successRate : metrics?.successRate ?? 0;
    }

    return metrics?.successRate ?? 0;
  }, [metrics?.successRate, statusCountsAuthorized, statusCountsTotal, timeseriesAggregates.authorized, timeseriesAggregates.total]);

  const fallbackPspDistribution = useMemo(() => {
    return Object.entries(providerPaymentDetails).map(([provider, details]) => {
      const totalAmountMinor = details.reduce((sum, payment) => sum + payment.amountMinor, 0);
      const currency = (
        details[0]?.currency ??
        providerCurrencyMap[provider] ??
        metrics?.totalAmountCurrency ??
        "CLP"
      ).toUpperCase();

      return {
        provider: provider as ProviderType,
        totalAmountMinor,
        count: details.length,
        currency,
      };
    });
  }, [providerPaymentDetails, providerCurrencyMap, metrics?.totalAmountCurrency]);

  const leaderboardDistribution = useMemo(() => {
    if (fallbackPspDistribution.length > 0) {
      return fallbackPspDistribution;
    }

    const base = metrics?.pspDistribution ?? [];
    if (base.length === 0) return [];

    const fallbackMap = new Map(
      fallbackPspDistribution.map((entry) => [entry.provider, entry]),
    );

    const merged = base.map((item) => {
      const fallback = fallbackMap.get(item.provider);
      if (!fallback) return item;

      const fallbackAmount = fallback.totalAmountMinor;
      const metricAmount = item.totalAmountMinor;

      const shouldReplace =
        fallbackAmount > 0 &&
        (metricAmount === 0 || fallbackAmount > metricAmount * 50 || metricAmount > fallbackAmount * 50);

      return {
        provider: item.provider,
        totalAmountMinor: shouldReplace ? fallbackAmount : metricAmount,
        count: item.count ?? fallback.count,
        currency: fallback.currency ?? item.currency ?? metrics?.totalAmountCurrency ?? "CLP",
      };
    });

    const missingFallback = fallbackPspDistribution.filter(
      (entry) => !base.some((item) => item.provider === entry.provider),
    );

    return merged.concat(missingFallback);
  }, [metrics?.pspDistribution, fallbackPspDistribution, metrics?.totalAmountCurrency]);

  const leaderboardMetrics = useMemo(() => {
    if (leaderboardDistribution.length > 0) {
      const filteredTotalAmount = leaderboardDistribution.reduce((sum, entry) => sum + entry.totalAmountMinor, 0);
      const filteredCurrency = leaderboardDistribution[0]?.currency ?? metrics?.totalAmountCurrency ?? null;

      if (metrics) {
        return {
          ...metrics,
          totalAmountMinor: filteredTotalAmount || metrics.totalAmountMinor,
          totalAmountCurrency: filteredCurrency ?? metrics.totalAmountCurrency,
          pspDistribution: leaderboardDistribution,
          topPsp: metrics.topPsp ?? leaderboardDistribution[0]?.provider ?? null,
        } satisfies MetricsPayload;
      }

      return {
        totalPayments: 0,
        totalAmountMinor: filteredTotalAmount,
        totalAmountCurrency: filteredCurrency ?? null,
        activeCompanies: 0,
        successRate: 0,
        topPsp: leaderboardDistribution[0]?.provider ?? null,
        timeseries: [],
        pspDistribution: leaderboardDistribution,
        totalsByCurrency: totalsByCurrency.map((entry) => ({
          currency: entry.currency,
          amountMinor: entry.amountMinor,
        })),
        serviceHealth: [],
        statusCounts: {},
        providerCounts: {},
      } satisfies MetricsPayload;
    }

    return metrics;
  }, [leaderboardDistribution, metrics, totalsByCurrency]);

  const topPspLabel = useMemo(() => {
    const sortedByAmount = [...leaderboardDistribution].sort(
      (a, b) => (b.totalAmountMinor ?? 0) - (a.totalAmountMinor ?? 0),
    );
    const leaderboardTop = sortedByAmount.find((entry) => (entry.totalAmountMinor ?? 0) > 0)?.provider;
    if (leaderboardTop) return leaderboardTop;

    if (metrics?.topPsp) return metrics.topPsp;

    const providerEntries = Object.entries(providerAmounts ?? {}).sort(
      ([, amountA], [, amountB]) => amountB - amountA,
    );
    const fallback = providerEntries.find(([, amount]) => amount > 0)?.[0] ?? providerEntries[0]?.[0];
    return fallback ?? "N/A";
  }, [leaderboardDistribution, metrics?.topPsp, providerAmounts]);

  return (
    <section className="grid grid-cols-12 gap-6">
      <div className="col-span-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 min-[1920px]:grid-cols-8">
      <KpiCard
          title="Total payments"
          value={totalPaymentsValue}
          loading={loading}
          delta={3.2}
          className="h-full"
        />
        {totalsByCurrency.map((entry) => {
          const providers = Object.entries(entry.providers ?? {})
            .filter(([, amount]) => amount > 0)
            .sort(([, amountA], [, amountB]) => amountB - amountA);

          return (
            <KpiCard
              key={entry.currency}
              title={`Processed (${entry.currency})`}
              value={entry.amountMinor}
              formatter={(value) => formatCurrency(value, entry.currency)}
              loading={loading}
              className="h-full"
            >
              {providers.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {providers.map(([provider, amount]) => (
                    <li key={provider} className="flex items-center justify-between gap-3">
                      <span className="capitalize">{provider}</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(amount, entry.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No PSPs in range</p>
              )}
            </KpiCard>
          );
        })}
        <KpiCard
          title="Active companies"
          value={metrics?.activeCompanies ?? 0}
          loading={loading}
          className="h-full"
        />
      <KpiCard
          title="Success rate"
          value={successRateValue}
          formatter={percentageFormatter}
          loading={loading}
          delta={-0.8}
          className="h-full"
        />
        <KpiCard
          title="Top PSP"
          value={0}
          loading={loading}
          formatter={() => topPspLabel}
          className="h-full"
        />
      </div>

      <div className="col-span-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 min-[1920px]:grid-cols-8">
        {ALL_STATUSES.map((status) => (
          <KpiCard
            key={status}
            title={`Payments · ${status}`}
            value={statusCounts[status] ?? 0}
            loading={loading}
            className="h-full"
          />
        ))}
      </div>

      {Object.keys(providerCounts).length > 0 ? (
        <div className="col-span-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 min-[1920px]:grid-cols-8">
          {Object.entries(providerCounts).map(([provider, count]) => (
            <KpiCard
              key={provider}
              title={`Payments · ${provider}`}
              value={count}
              loading={loading}
              className="h-full"
            />
          ))}
        </div>
      ) : null}

      <TimeSeriesChart data={timeseries} loading={loading} />
      <PspLeaderboard metrics={leaderboardMetrics} loading={loading} />
    </section>
  );
};
