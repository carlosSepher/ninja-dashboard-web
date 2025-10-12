import { useCallback, useEffect, useMemo, useState } from "react";

import { JsonPreview } from "@/components/JsonPreview";
import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import { useDashboardStore } from "@/store";
import type { CrmEventLogEntry } from "@/store/types/dashboard";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

export const CrmEventLogsPage = () => {
  const filters = useDashboardStore((state) => state.filters);
  const [items, setItems] = useState<CrmEventLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getCrmEventLogs({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        provider: filters.provider === "all" ? undefined : filters.provider,
        page,
        pageSize: PAGE_SIZE,
      });

      const paymentIdFilter = filters.paymentId?.trim().toLowerCase();
      const filteredItems = paymentIdFilter
        ? response.items.filter((item) =>
            (item.paymentId ?? "").toLowerCase().includes(paymentIdFilter),
          )
        : response.items;

      setItems(filteredItems);
      setTotal(paymentIdFilter ? filteredItems.length : response.count);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.dateRange.from, filters.dateRange.to, filters.paymentId, filters.provider, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.dateRange.from, filters.dateRange.to, filters.provider, filters.paymentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<PaginatedColumn<CrmEventLogEntry>[]>(
    () => [
      { header: "Log ID", render: (item) => item.id },
      { header: "Payment", render: (item) => item.paymentId ?? "—" },
      { header: "Provider", render: (item) => item.provider },
      { header: "Operation", render: (item) => item.operation },
      {
        header: "Request",
        render: (item) => (
          <div className="flex items-center gap-2">
            <JsonPreview data={item.requestHeaders} title={`Request headers ${item.id}`} />
            <JsonPreview data={item.requestBody} title={`Request body ${item.id}`} />
          </div>
        ),
      },
      {
        header: "Response",
        render: (item) => (
          <div className="flex items-center gap-2">
            <JsonPreview data={item.responseHeaders} title={`Response headers ${item.id}`} />
            <JsonPreview data={item.responseBody} title={`Response body ${item.id}`} />
          </div>
        ),
      },
      {
        header: "Status",
        render: (item) =>
          item.responseStatus != null ? <Badge variant="secondary">{item.responseStatus}</Badge> : "—",
      },
      {
        header: "Latency",
        render: (item) => (item.latencyMs != null ? `${item.latencyMs} ms` : "—"),
      },
      {
        header: "Error",
        render: (item) => item.errorMessage ?? "—",
      },
      {
        header: "Created",
        render: (item) => formatDateTime(item.createdAt),
      },
    ],
    [],
  );

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="CRM event logs"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage="No CRM event logs for selected filters"
      />
    </section>
  );
};
