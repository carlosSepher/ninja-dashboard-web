import { useCallback, useEffect, useState } from "react";

import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { Dispute } from "@/store/types/dashboard";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

export const DisputesPage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDisputes({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        provider: filters.provider === "all" ? undefined : filters.provider,
        status: filters.status === "all" ? undefined : filters.status,
        buyOrder: filters.buyOrder.trim() ? filters.buyOrder.trim() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(response.items);
      setTotal(response.count);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.buyOrder, filters.dateRange.from, filters.dateRange.to, filters.provider, filters.status, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.dateRange.from, filters.dateRange.to, filters.provider, filters.status, filters.buyOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: PaginatedColumn<Dispute>[] = [
    { header: "Dispute ID", render: (item) => item.id },
    { header: "Payment", render: (item) => item.paymentId ?? "—" },
    { header: "Provider", render: (item) => item.provider },
    { header: "Status", render: (item) => item.status ?? "—" },
    {
      header: "Amount",
      render: (item) =>
        item.amountMinor && item.currency
          ? formatCurrency(item.amountMinor, item.currency)
          : "—",
    },
    {
      header: "Reason",
      render: (item) => item.reason ?? "—",
    },
    {
      header: "Created",
      render: (item) => formatDateTime(item.createdAt),
    },
    {
      header: "Updated",
      render: (item) => formatDateTime(item.updatedAt),
    },
  ];

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="Disputes"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage="No disputes for selected filters"
      />
    </section>
  );
};
