import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { JsonPreview } from "@/components/JsonPreview";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { StatusCheckEntry } from "@/store/types/dashboard";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  AUTHORIZED: "default",
  APPROVED: "default",
  COMPLETED: "default",
  PENDING: "secondary",
  INITIALIZED: "secondary",
  FAILED: "destructive",
  CANCELED: "destructive",
  ERROR: "destructive",
};

export const StatusChecksPage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<StatusCheckEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getStatusChecks({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        provider: filters.provider === "all" ? undefined : filters.provider,
        status: filters.status === "all" ? undefined : filters.status,
        paymentId: filters.paymentId?.trim() ? filters.paymentId.trim() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      const normalizedProvider = filters.provider === "all" ? null : filters.provider.toLowerCase();
      const normalizedStatus = filters.status === "all" ? null : filters.status.toUpperCase();
      const normalizedPaymentId = filters.paymentId?.trim().toLowerCase() ?? "";

      const providerFiltered = normalizedProvider
        ? response.items.filter((item) => item.provider?.toLowerCase() === normalizedProvider)
        : response.items;

      const statusFiltered = normalizedStatus
        ? providerFiltered.filter((item) => (item.mappedStatus ?? "").toUpperCase() === normalizedStatus)
        : providerFiltered;

      const paymentFiltered = normalizedPaymentId
        ? statusFiltered.filter((item) => item.paymentId?.toLowerCase().includes(normalizedPaymentId))
        : statusFiltered;

      setItems(paymentFiltered);
      const shouldUseResponseCount = !normalizedProvider && !normalizedStatus && !normalizedPaymentId;
      setTotal(shouldUseResponseCount ? response.count : paymentFiltered.length);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.dateRange.from, filters.dateRange.to, filters.paymentId, filters.provider, filters.status, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.dateRange.from, filters.dateRange.to, filters.provider, filters.status, filters.paymentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<PaginatedColumn<StatusCheckEntry>[]>(
    () => [
      { header: "Check ID", render: (item) => item.id },
      {
        header: "Payment",
        render: (item) => item.paymentId ?? "—",
      },
      {
        header: "Provider",
        render: (item) => item.provider,
      },
      {
        header: "Mapped status",
        render: (item) => {
          const variant = STATUS_VARIANTS[item.mappedStatus ?? ""] ?? "secondary";
          return item.mappedStatus ? <Badge variant={variant}>{item.mappedStatus}</Badge> : "—";
        },
      },
      {
        header: "Success",
        render: (item) => (
          <Badge variant={item.success ? "default" : "destructive"}>{item.success ? "Yes" : "No"}</Badge>
        ),
      },
      {
        header: "Provider status",
        render: (item) => item.providerStatus ?? "—",
      },
      {
        header: "Response code",
        render: (item) => item.responseCode ?? "—",
      },
      {
        header: "Requested at",
        render: (item) => formatDateTime(item.requestedAt),
      },
      {
        header: "Payload",
        render: (item) => <JsonPreview data={item.rawPayload} title={`Status check ${item.id}`} />,
      },
      {
        header: "Error",
        render: (item) => item.errorMessage ?? "—",
      },
    ],
    [],
  );

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="Status checks"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage="No status checks for selected filters"
      />
    </section>
  );
};
