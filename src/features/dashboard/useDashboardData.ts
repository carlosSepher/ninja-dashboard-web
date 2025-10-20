import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DASHBOARD_DATA_REFRESH_ENABLED,
  DASHBOARD_DATA_REFRESH_INTERVAL_MS,
  DASHBOARD_HEALTH_REFRESH_ENABLED,
  DASHBOARD_HEALTH_REFRESH_INTERVAL_MS,
} from "@/lib/constants";
import { logError, logInfo } from "@/lib/logger";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { Payment, ProviderType, StreamEvent, TimeseriesPoint } from "@/store/types/dashboard";

const DEFAULT_PROVIDERS: ProviderType[] = ["webpay", "stripe", "paypal"];
const DEFAULT_CURRENCIES = ["CLP", "USD"] as const;

export const useDashboardData = () => {
  const filters = useDashboardStore((state) => state.filters);
  const metrics = useDashboardStore((state) => state.metrics);
  const health = useDashboardStore((state) => state.health);
  const setMetrics = useDashboardStore((state) => state.setMetrics);
  const setHealth = useDashboardStore((state) => state.setHealth);
  const pushEvent = useDashboardStore((state) => state.pushEvent);
  const setStream = useDashboardStore((state) => state.setStream);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsSource, setPaymentsSource] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPayments, setTotalPayments] = useState(0);
  const [paymentsSourceTotal, setPaymentsSourceTotal] = useState(0);
  const deliveredEventsRef = useRef<Set<string>>(new Set());

  const loadMetrics = useCallback(async () => {
    try {
      setMetrics({ loading: true, error: null });
      const data = await apiClient.getMetrics({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
      });
      setMetrics({ data, loading: false, error: null });
      logInfo("metrics refresh", { totalPayments: data.totalPayments });
    } catch (error) {
      const message = (error as Error).message;
      setMetrics({ loading: false, error: message });
      logError("metrics fetch failed", error);
    }
  }, [filters.dateRange.from, filters.dateRange.to, setMetrics]);

  const loadHealth = useCallback(async () => {
    try {
      setHealth({ loading: true, error: null });
      const data = await apiClient.getServicesHealth();
      setHealth({ services: data, loading: false, error: null });
      logInfo("health refresh", { services: data.map((item) => item.id) });
    } catch (error) {
      const message = (error as Error).message;
      setHealth({ loading: false, error: message });
      logError("health fetch failed", error);
    }
  }, [setHealth]);

  const loadPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsError(null);

      const aggregated: Payment[] = [];
      let totalCount: number | null = null;
      let currentPage = 1;
      const requestPageSize = 25;
      let safetyCounter = 0;

      while (true) {
        const response = await apiClient.getPayments({
          from: filters.dateRange.from,
          to: filters.dateRange.to,
          provider: filters.provider === "all" ? undefined : filters.provider,
          status: filters.status === "all" ? undefined : filters.status,
          environment: filters.environment === "all" ? undefined : filters.environment,
          buyOrder: filters.buyOrder.trim() ? filters.buyOrder.trim() : undefined,
          page: currentPage,
          pageSize: requestPageSize,
        });

        if (typeof response.count === "number" && Number.isFinite(response.count)) {
          totalCount = Math.max(totalCount ?? 0, response.count);
        }

        if (response.items.length === 0) {
          break;
        }

        aggregated.push(...response.items);

        const hasNextOffset = response.nextOffset !== null;
        const hasFullPage = response.items.length === requestPageSize;

        if (!hasNextOffset && !hasFullPage) {
          break;
        }

        currentPage += 1;
        safetyCounter += 1;
        if (safetyCounter > 200) {
          logInfo("payments pagination safety stop", { currentPage, aggregated: aggregated.length });
          break;
        }
      }

      const resolvedTotal = totalCount !== null ? Math.max(totalCount, aggregated.length) : aggregated.length;

      setPaymentsSource(aggregated);
      setPaymentsSourceTotal(resolvedTotal);
      logInfo("payments refresh", { fetched: aggregated.length, total: resolvedTotal, pages: currentPage });
    } catch (error) {
      const message = (error as Error).message;
      setPaymentsError(message);
      logError("payments fetch failed", error);
    } finally {
      setPaymentsLoading(false);
    }
  }, [
    filters.buyOrder,
    filters.dateRange.from,
    filters.dateRange.to,
    filters.environment,
    filters.provider,
    filters.status,
  ]);

  useEffect(() => {
    loadMetrics();
    loadHealth();

    const dataInterval = DASHBOARD_DATA_REFRESH_ENABLED
      ? window.setInterval(loadMetrics, DASHBOARD_DATA_REFRESH_INTERVAL_MS)
      : null;

    const healthInterval = DASHBOARD_HEALTH_REFRESH_ENABLED
      ? window.setInterval(loadHealth, DASHBOARD_HEALTH_REFRESH_INTERVAL_MS)
      : null;

    return () => {
      if (dataInterval) {
        window.clearInterval(dataInterval);
      }
      if (healthInterval) {
        window.clearInterval(healthInterval);
      }
    };
  }, [loadMetrics, loadHealth]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.dateRange.from,
    filters.dateRange.to,
    filters.provider,
    filters.status,
    filters.environment,
    filters.buyOrder,
  ]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const trimmedBuyOrder = filters.buyOrder.trim();
    const trimmedPaymentId = filters.paymentId.trim();
    const normalizedBuyOrder = trimmedBuyOrder.toLowerCase();
    const normalizedPaymentId = trimmedPaymentId.toLowerCase();
    const shouldFilter = Boolean(trimmedBuyOrder || trimmedPaymentId);

    const filteredItems = shouldFilter
      ? paymentsSource.filter((item) => {
          const matchesBuyOrder = trimmedBuyOrder
            ? item.buyOrder.toLowerCase().includes(normalizedBuyOrder)
            : true;
          const matchesPaymentId = trimmedPaymentId
            ? item.id.toLowerCase().includes(normalizedPaymentId)
            : true;
          return matchesBuyOrder && matchesPaymentId;
        })
      : paymentsSource;

    const maxPage = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
      return;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    setPayments(filteredItems.slice(start, end));
    setTotalPayments(filteredItems.length);
  }, [filters.buyOrder, filters.paymentId, page, pageSize, paymentsSource]);

  const authorizedPayments = useMemo(
    () =>
      paymentsSource.filter((payment) => (payment.status ?? "").toUpperCase() === "AUTHORIZED"),
    [paymentsSource],
  );

  const reload = useCallback(() => {
    loadMetrics();
    loadHealth();
    loadPayments();
  }, [loadMetrics, loadHealth, loadPayments]);

  useEffect(() => {
    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const events = await apiClient.getLatestEvents();
        if (!isMounted) return;
        events.forEach((event: StreamEvent) => {
          const registry = deliveredEventsRef.current;
          if (!registry.has(event.id)) {
            registry.add(event.id);
            if (registry.size > 200) {
              const first = registry.values().next().value as string | undefined;
              if (first) {
                registry.delete(first);
              }
            }
            pushEvent(event);
          }
        });
        setStream({ connected: true, lastError: null });
      } catch (error) {
        if (!isMounted) return;
        const message = (error as Error).message;
        logError("latest events fetch failed", error);
        setStream({ connected: false, lastError: message });
      }
    };

    fetchEvents();

    return () => {
      isMounted = false;
      setStream({ connected: false });
    };
  }, [pushEvent, setStream]);

  const derivedStatusCounts = useMemo(() => {
    const metricsCounts = metrics.data?.statusCounts;
    if (metricsCounts && Object.keys(metricsCounts).length > 0) {
      return metricsCounts;
    }
    return paymentsSource.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.status] = (acc[payment.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [metrics.data?.statusCounts, paymentsSource]);

  const derivedProviderCounts = useMemo(() => {
    let baseCounts: Record<string, number> = {};

    if (paymentsSource.length > 0) {
      baseCounts = paymentsSource.reduce<Record<string, number>>((acc, payment) => {
        acc[payment.provider] = (acc[payment.provider] ?? 0) + 1;
        return acc;
      }, {});
    } else if (metrics.data?.providerCounts && Object.keys(metrics.data.providerCounts).length > 0) {
      baseCounts = { ...metrics.data.providerCounts };
    }

    if (Object.keys(baseCounts).length === 0) {
      DEFAULT_PROVIDERS.forEach((provider) => {
        baseCounts[provider] = 0;
      });
    }

    return baseCounts;
  }, [metrics.data?.providerCounts, paymentsSource]);

  const providerAmounts = useMemo(() => {
    let baseAmounts: Record<string, number> = {};

    if (authorizedPayments.length > 0) {
      baseAmounts = authorizedPayments.reduce<Record<string, number>>((acc, payment) => {
        acc[payment.provider] = (acc[payment.provider] ?? 0) + payment.amountMinor;
        return acc;
      }, {});
    } else if (metrics.data?.pspDistribution && metrics.data.pspDistribution.length > 0) {
      baseAmounts = metrics.data.pspDistribution.reduce<Record<string, number>>((acc, item) => {
        acc[item.provider] = item.totalAmountMinor;
        return acc;
      }, {});
    }

    if (Object.keys(baseAmounts).length === 0) {
      DEFAULT_PROVIDERS.forEach((provider) => {
        baseAmounts[provider] = 0;
      });
    }

    return baseAmounts;
  }, [authorizedPayments, metrics.data?.pspDistribution]);

  const providerPaymentDetails = useMemo(() => {
    return authorizedPayments.reduce<Record<string, { id: string; amountMinor: number; currency: string }[]>>(
      (acc, payment) => {
        if (!acc[payment.provider]) {
          acc[payment.provider] = [];
        }

        const mappedPayment = {
          id: String(payment.id),
          amountMinor: payment.amountMinor,
          currency: payment.currency,
        };

        acc[payment.provider].push(mappedPayment);
        return acc;
      },
      {},
    );
  }, [authorizedPayments]);

  const totalsByCurrency = useMemo(() => {
    let entries: { currency: string; amountMinor: number; providers?: Record<string, number> }[] = [];

    if (authorizedPayments.length > 0) {
      const aggregates = authorizedPayments.reduce<
        Record<
          string,
          {
            amountMinor: number;
            providers: Record<string, number>;
          }
        >
      >((acc, payment) => {
        const normalizedCurrency = payment.currency.toUpperCase();
        if (!acc[normalizedCurrency]) {
          acc[normalizedCurrency] = { amountMinor: 0, providers: {} };
        }
        acc[normalizedCurrency].amountMinor += payment.amountMinor;
        acc[normalizedCurrency].providers[payment.provider] =
          (acc[normalizedCurrency].providers[payment.provider] ?? 0) + payment.amountMinor;
        return acc;
      }, {});

      entries = Object.entries(aggregates).map(([currency, entry]) => ({
        currency,
        amountMinor: entry.amountMinor,
        providers: entry.providers,
      }));
    } else {
      const currencyTotals = metrics.data?.totalsByCurrency ?? [];
      const fallbackCurrency = metrics.data?.totalAmountCurrency;
      const aggregatedFallback = currencyTotals.length
        ? currencyTotals
        : fallbackCurrency
          ? [
              {
                currency: fallbackCurrency,
                amountMinor: metrics.data?.totalAmountMinor ?? 0,
              },
            ]
          : [];

      const sanitized = aggregatedFallback
        .map((entry) => ({
          currency: entry.currency?.toUpperCase?.() ?? entry.currency,
          amountMinor: entry.amountMinor,
        }))
        .filter((entry): entry is { currency: string; amountMinor: number } =>
          Boolean(entry.currency) && entry.currency !== "MIXED",
        );

      const distribution = metrics.data?.pspDistribution ?? [];

      entries = sanitized.map((entry) => {
        const providers = distribution
          .filter((item) => {
            const currency =
              item.currency?.toUpperCase?.() ?? metrics.data?.totalAmountCurrency?.toUpperCase() ?? entry.currency;
            return currency === entry.currency;
          })
          .reduce<Record<string, number>>((acc, item) => {
            acc[item.provider] = (acc[item.provider] ?? 0) + item.totalAmountMinor;
            return acc;
          }, {});

        return {
          currency: entry.currency,
          amountMinor: entry.amountMinor,
          providers: Object.keys(providers).length > 0 ? providers : undefined,
        };
      });
    }

    if (entries.length === 0) {
      entries = DEFAULT_CURRENCIES.map((currency) => ({
        currency,
        amountMinor: 0,
        providers: undefined,
      }));
    }

    return entries;
  }, [
    authorizedPayments,
    metrics.data?.totalsByCurrency,
    metrics.data?.totalAmountCurrency,
    metrics.data?.totalAmountMinor,
    metrics.data?.pspDistribution,
  ]);

  const fallbackTimeseries = useMemo(() => {
    if (paymentsSource.length === 0) return [] as TimeseriesPoint[];

    const grouped = new Map<
      string,
      {
        count: number;
        amountMinor: number;
        success: number;
        currency: string;
        providers: Map<string, { total: number; authorized: number }>;
      }
    >();

    paymentsSource.forEach((payment) => {
      const bucket = new Date(payment.createdAt);
      bucket.setMinutes(0, 0, 0);
      const key = bucket.toISOString();
      const entry =
        grouped.get(key) ??
        {
          count: 0,
          amountMinor: 0,
          success: 0,
          currency: payment.currency,
          providers: new Map<string, { total: number; authorized: number }>(),
        };

      entry.count += 1;
      entry.amountMinor += payment.amountMinor;
      if (payment.status === "AUTHORIZED") {
        entry.success += 1;
      }
      entry.currency = payment.currency;

      const providerEntry = entry.providers.get(payment.provider) ?? { total: 0, authorized: 0 };
      providerEntry.total += 1;
      if (payment.status === "AUTHORIZED") {
        providerEntry.authorized += 1;
      }
      entry.providers.set(payment.provider, providerEntry);

      grouped.set(key, entry);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([timestamp, stats]) => ({
        timestamp,
        count: stats.count,
        amountMinor: stats.amountMinor,
        successRate: stats.count ? (stats.success / stats.count) * 100 : 0,
        currency: stats.currency,
        providers: Object.fromEntries(
          Array.from(stats.providers.entries()).map(([provider, providerStats]) => [
            provider,
            {
              total: providerStats.total,
              authorized: providerStats.authorized,
              successRate:
                providerStats.total > 0
                  ? (providerStats.authorized / providerStats.total) * 100
                  : 0,
            },
          ]),
        ),
      }));
  }, [paymentsSource]);

  const timeseriesWithProviders = useMemo(() => {
    const metricsTimeseries = metrics.data?.timeseries ?? [];
    const hasProviderBreakdown = metricsTimeseries.some(
      (point) => point.providers && Object.keys(point.providers).length > 0,
    );

    if (hasProviderBreakdown) {
      return metricsTimeseries;
    }

    if (fallbackTimeseries.length > 0) {
      if (metricsTimeseries.length === 0) {
        return fallbackTimeseries;
      }

      const fallbackMap = new Map(
        fallbackTimeseries.map((entry) => [entry.timestamp, entry.providers ?? {}]),
      );

      const merged = metricsTimeseries.map((point) => ({
        ...point,
        providers: fallbackMap.get(point.timestamp) ?? point.providers,
      }));

      const mergedHasProviders = merged.some(
        (point) => point.providers && Object.keys(point.providers).length > 0,
      );

      return mergedHasProviders ? merged : fallbackTimeseries;
    }

    return metricsTimeseries;
  }, [metrics.data?.timeseries, fallbackTimeseries]);

  return {
    filters,
    metrics,
    health,
    payments,
    paymentsLoading,
    paymentsError,
    page,
    pageSize,
    totalPayments,
    setPage,
    reload,
    statusCounts: derivedStatusCounts,
    providerCounts: derivedProviderCounts,
    totalsByCurrency,
    providerAmounts,
    providerPaymentDetails,
    timeseries: timeseriesWithProviders,
  };
};
