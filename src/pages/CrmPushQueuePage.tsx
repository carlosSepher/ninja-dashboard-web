import { useCallback, useEffect, useMemo, useState } from "react";

import { JsonPreview } from "@/components/JsonPreview";
import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { CrmPushQueueEntry } from "@/store/types/dashboard";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  SENT: "default",
  PENDING: "secondary",
  FAILED: "destructive",
};

export const CrmPushQueuePage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<CrmPushQueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getCrmPushQueue({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        provider: filters.provider === "all" ? undefined : filters.provider,
        page,
        pageSize: PAGE_SIZE,
      });

      const paymentIdFilter = filters.paymentId?.trim().toLowerCase();
      const statusFilter = filters.status !== "all" ? filters.status?.toUpperCase() : null;

      const filteredItems = response.items.filter((item) => {
        const matchesPaymentId = paymentIdFilter
          ? (item.paymentId ?? "").toLowerCase().includes(paymentIdFilter)
          : true;
        const matchesStatus = statusFilter ? item.status.toUpperCase() === statusFilter : true;
        return matchesPaymentId && matchesStatus;
      });

      setItems(filteredItems);
      setTotal(filteredItems.length);
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

  const columns = useMemo<PaginatedColumn<CrmPushQueueEntry>[]>(
    () => [
      { header: "Queue ID", render: (item) => item.id },
      { header: "Payment", render: (item) => item.paymentId ?? "—" },
      { header: "Provider", render: (item) => item.provider },
      { header: "Operation", render: (item) => item.operation },
      {
        header: "Status",
        render: (item) => {
          const variant = STATUS_VARIANTS[item.status] ?? "secondary";
          return <Badge variant={variant}>{item.status}</Badge>;
        },
      },
      {
        header: "Attempts",
        render: (item) => item.attempts,
      },
      {
        header: "Next attempt",
        render: (item) => (item.nextAttemptAt ? formatDateTime(item.nextAttemptAt) : "—"),
      },
      {
        header: "Response code",
        render: (item) => item.responseCode ?? "—",
      },
      {
        header: "Payload",
        render: (item) => <JsonPreview data={item.payload} title={`CRM payload ${item.id}`} />,
      },
      {
        header: "Last error",
        render: (item) => item.lastError ?? "—",
      },
      {
        header: "Updated",
        render: (item) => formatDateTime(item.updatedAt),
      },
    ],
    [],
  );

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="CRM push queue"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage="No CRM push queue items for selected filters"
      />
    </section>
  );
};
