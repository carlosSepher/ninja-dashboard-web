import { useCallback, useEffect, useState } from "react";

import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { WebhookInboxEntry } from "@/store/types/dashboard";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

export const WebhooksPage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<WebhookInboxEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getWebhooks({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        provider: filters.provider === "all" ? undefined : filters.provider,
        paymentId: filters.paymentId.trim() ? filters.paymentId.trim() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      const normalizedPaymentId = filters.paymentId.trim().toLowerCase();
      const filteredItems = normalizedPaymentId
        ? response.items.filter((item) =>
            item.paymentId?.toLowerCase().includes(normalizedPaymentId),
          )
        : response.items;

      setItems(filteredItems);
      setTotal(normalizedPaymentId ? filteredItems.length : response.count);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.paymentId, filters.dateRange.from, filters.dateRange.to, filters.provider, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.dateRange.from, filters.dateRange.to, filters.provider, filters.paymentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: PaginatedColumn<WebhookInboxEntry>[] = [
    { header: "Webhook ID", render: (item) => item.id },
    { header: "Provider", render: (item) => item.provider },
    {
      header: "Verification",
      render: (item) => item.verificationStatus,
    },
    {
      header: "Payment",
      render: (item) => item.paymentId ?? "—",
    },
    {
      header: "Received",
      render: (item) => formatDateTime(item.receivedAt),
    },
  ];

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="Webhook inbox"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage="No webhooks for selected filters"
      />
    </section>
  );
};
