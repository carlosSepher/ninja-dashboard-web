import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowRight, CornerDownRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { PaymentStateHistoryEntry } from "@/store/types/dashboard";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 50;

export const PaymentStateHistoryPage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<PaymentStateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getPaymentStateHistory({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        status: filters.status === "all" ? undefined : filters.status,
        buyOrder: filters.buyOrder.trim() ? filters.buyOrder.trim() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      const normalizedBuyOrder = filters.buyOrder.trim().toLowerCase();
      const normalizedStatus = filters.status === "all" ? null : filters.status;

      const providerFiltered =
        filters.provider === "all"
          ? response.items
          : response.items.filter((item) =>
              item.provider
                ? item.provider.toLowerCase() === filters.provider.toLowerCase()
                : false,
            );

      const statusFiltered = (() => {
        if (!normalizedStatus) return providerFiltered;

        const normalizedStatusUpper = normalizedStatus.toUpperCase();
        const latestByPayment = providerFiltered.reduce<
          Map<
            string,
            {
              status: string | null;
              timestamp: number;
            }
          >
        >((acc, entry) => {
          const paymentId = entry.paymentId;
          if (!paymentId) return acc;

          const occurredAt = entry.occurredAt ?? entry.createdAt;
          const timestamp = new Date(occurredAt).getTime();
          const fallbackTimestamp = Number.isFinite(timestamp) ? timestamp : -Infinity;

          const existing = acc.get(paymentId);
          if (!existing || fallbackTimestamp > existing.timestamp) {
            acc.set(paymentId, {
              status: entry.toStatus ?? null,
              timestamp: fallbackTimestamp,
            });
          }

          return acc;
        }, new Map());

        const allowedPaymentIds = new Set(
          Array.from(latestByPayment.entries())
            .filter(([, meta]) => (meta.status ?? "").toUpperCase() === normalizedStatusUpper)
            .map(([paymentId]) => paymentId),
        );

        return providerFiltered.filter((entry) => allowedPaymentIds.has(entry.paymentId));
      })();

      const buyOrderFiltered = normalizedBuyOrder
        ? statusFiltered.filter((item) =>
            item.buyOrder?.toLowerCase().includes(normalizedBuyOrder),
          )
        : statusFiltered;

      setItems(buyOrderFiltered);
      const shouldUseResponseCount =
        filters.provider === "all" && !normalizedBuyOrder && !normalizedStatus;
      setTotal(shouldUseResponseCount ? response.count : buyOrderFiltered.length);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.buyOrder, filters.dateRange.from, filters.dateRange.to, filters.status, filters.provider, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.dateRange.from, filters.dateRange.to, filters.status, filters.buyOrder, filters.provider]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaries = useMemo(() => {
    const map = new Map<
      string,
      {
        paymentId: string;
        buyOrder: string | null;
        latestStatus: string;
        latestAt: string;
        steps: number;
      }
    >();

    items.forEach((entry) => {
      const eventTimestamp = entry.occurredAt ?? entry.createdAt;
      const paymentId = entry.paymentId;
      const existing = map.get(paymentId);
      if (!existing) {
        map.set(paymentId, {
          paymentId,
          buyOrder: entry.buyOrder ?? null,
          latestStatus: entry.toStatus,
          latestAt: eventTimestamp,
          steps: 1,
        });
      } else {
        existing.steps += 1;
        if (new Date(eventTimestamp).getTime() > new Date(existing.latestAt).getTime()) {
          existing.latestAt = eventTimestamp;
          existing.latestStatus = entry.toStatus;
          if (entry.buyOrder) {
            existing.buyOrder = entry.buyOrder;
          }
        }
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
    );
  }, [items]);

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (summaries.length === 0) {
      setSelectedPaymentId(null);
      return;
    }

    setSelectedPaymentId((prev) => (prev && summaries.some((summary) => summary.paymentId === prev) ? prev : summaries[0]?.paymentId ?? null));
  }, [summaries]);

  const selectedSummary = useMemo(
    () => summaries.find((summary) => summary.paymentId === selectedPaymentId) ?? null,
    [summaries, selectedPaymentId],
  );

  const selectedHistory = useMemo(() => {
    if (!selectedPaymentId) return [] as PaymentStateHistoryEntry[];
    return items
      .filter((entry) => entry.paymentId === selectedPaymentId)
      .sort(
        (a, b) =>
          new Date(a.occurredAt ?? a.createdAt).getTime() -
          new Date(b.occurredAt ?? b.createdAt).getTime(),
      );
  }, [items, selectedPaymentId]);

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, page * PAGE_SIZE);
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (page < maxPage) setPage(page + 1);
  };

  return (
    <section className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment state history
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing {total === 0 ? 0 : start}-{end} of {total}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              className="rounded-md border border-input px-3 py-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handlePrev}
              disabled={page === 1 || loading}
            >
              Previous
            </button>
            <span>
              Page {page} of {maxPage}
            </span>
            <button
              type="button"
              className="rounded-md border border-input px-3 py-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleNext}
              disabled={page === maxPage || loading}
            >
              Next
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ) : summaries.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No history records for selected filters
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] md:h-[520px] md:overflow-hidden">
              <div className="flex h-full flex-col md:overflow-hidden">
                <div className="space-y-3 overflow-y-auto pr-1 md:flex-1 md:pr-2">
                  {summaries.map((summary) => {
                    const isActive = summary.paymentId === selectedPaymentId;
                    return (
                      <button
                        key={summary.paymentId}
                        type="button"
                        onClick={() => setSelectedPaymentId(summary.paymentId)}
                        className={cn(
                          "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isActive ? "border-primary bg-primary/10" : "border-border",
                        )}
                      >
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>Payment</span>
                          <span>Steps: {summary.steps}</span>
                        </div>
                        <div className="mt-1 text-sm font-semibold">{summary.paymentId}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Last status: <span className="font-medium text-foreground">{summary.latestStatus}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Updated: {formatDateTime(summary.latestAt)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Buy order:</span>{" "}
                          <span className="font-semibold text-foreground">{summary.buyOrder ?? "—"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-[320px] rounded-lg border border-border/60 bg-card/60 p-5 md:h-full md:overflow-hidden">
                {!selectedPaymentId || selectedHistory.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Select a payment to inspect its journey
                  </div>
                ) : (
                  <div className="flex h-full flex-col gap-4 md:overflow-y-auto">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Payment {selectedPaymentId}</h2>
                      {(() => {
                        const derivedBuyOrder =
                          selectedSummary?.buyOrder ?? selectedHistory[0]?.buyOrder ?? null;
                        if (!derivedBuyOrder) return null;
                        return (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Buy order:</span>{" "}
                            <span className="font-semibold text-foreground">{derivedBuyOrder}</span>
                          </p>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">
                        State evolution across {selectedHistory.length} events
                      </p>
                    </div>
                    <ul className="space-y-6">
                      {selectedHistory.map((entry, index) => (
                        <li key={entry.id}>
                          <div className="flex items-start gap-3">
                            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span>{entry.fromStatus ?? "—"}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span>{entry.toStatus}</span>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatDateTime(entry.occurredAt ?? entry.createdAt)} · {entry.eventType ?? "event"}
                                {entry.actorType ? ` · ${entry.actorType}` : ""}
                              </div>
                              {entry.reason ? (
                                <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                  {entry.reason}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {index < selectedHistory.length - 1 ? (
                            <div className="ml-4 mt-2 flex items-center gap-2 border-l border-dashed border-muted-foreground/40 pl-4 text-muted-foreground">
                              <CornerDownRight className="h-4 w-4" />
                              <span className="text-xs">Next transition</span>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
