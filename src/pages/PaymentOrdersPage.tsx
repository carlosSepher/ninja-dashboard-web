import { useCallback, useEffect, useState } from "react";

import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { OrderStatus, PaymentOrder } from "@/store/types/dashboard";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  COMPLETED: "default",
  OPEN: "outline",
  PARTIAL: "secondary",
  CANCELED: "destructive",
  EXPIRED: "destructive",
  ABANDONED: "destructive",
};

export const PaymentOrdersPage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<PaymentOrder[]>([]);
  const [sourceItems, setSourceItems] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sourceTotal, setSourceTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getPaymentOrders({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        status: filters.status === "all" ? undefined : filters.status,
        environment: filters.environment === "all" ? undefined : filters.environment,
        buyOrder: filters.buyOrder.trim() ? filters.buyOrder.trim() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setSourceItems(response.items);
      setSourceTotal(response.count);
      setItems(response.items);
      setTotal(response.count);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    filters.buyOrder,
    filters.dateRange.from,
    filters.dateRange.to,
    filters.environment,
    filters.status,
    page,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.dateRange.from,
    filters.dateRange.to,
    filters.environment,
    filters.status,
    filters.buyOrder,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const normalizedPaymentId = filters.paymentId.trim().toLowerCase();
    if (normalizedPaymentId) {
      const filteredItems = sourceItems.filter((item) => {
        const candidates = [item.paymentId, item.id];
        return candidates.some((value) => value?.toLowerCase().includes(normalizedPaymentId));
      });
      setItems(filteredItems);
      setTotal(filteredItems.length);
      return;
    }

    setItems(sourceItems);
    setTotal(sourceTotal);
  }, [filters.paymentId, sourceItems, sourceTotal]);

  const columns: PaginatedColumn<PaymentOrder>[] = [
    { header: "Order ID", render: (item) => item.id },
    { header: "Buy order", render: (item) => item.buyOrder },
    { header: "Environment", render: (item) => item.environment },
    {
      header: "Status",
      render: (item) => <Badge variant={ORDER_STATUS_VARIANT[item.status]}>{item.status}</Badge>,
    },
    {
      header: "Amount expected",
      render: (item) => formatCurrency(item.amountExpectedMinor, item.currency),
    },
    {
      header: "Created",
      render: (item) => formatDateTime(item.createdAt),
    },
    {
      header: "Updated",
      render: (item) => formatDateTime(item.updatedAt ?? item.createdAt),
    },
  ];

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="Payment orders"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage="No payment orders for selected filters"
      />
    </section>
  );
};
