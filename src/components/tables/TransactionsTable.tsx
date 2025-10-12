import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { apiClient } from "@/services/apiClient";
import type { Payment } from "@/store/types/dashboard";
import type { Company } from "@/store/types/dashboard";

interface TransactionsTableProps {
  data: Payment[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onReload: () => void;
}

const statusVariant: Record<Payment["status"], "default" | "secondary" | "destructive"> = {
  AUTHORIZED: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  CANCELED: "secondary",
  REFUNDED: "secondary",
};

export const TransactionsTable = ({
  data,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onReload,
}: TransactionsTableProps) => {
  const [refundLoading, setRefundLoading] = useState<Record<string, boolean>>({});
  const companyCacheRef = useRef<Record<string, Company>>({});

  const extractErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err && typeof err === "object") {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail;
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }, []);

  const handleRefund = useCallback(
    async (payment: Payment) => {
      if (refundLoading[payment.id]) return;

      if (payment.status !== "AUTHORIZED") {
        window.alert("Refunds are only available for authorized payments.");
        return;
      }

      const companyId = payment.companyId;
      const token = payment.token ?? payment.id;

      if (!token) {
        window.alert("Payment is missing a provider token. Cannot process refund.");
        return;
      }
      if (!companyId) {
        window.alert("This payment is missing an associated company. Cannot process refund.");
        return;
      }

      const amountInput = window.prompt(
        "Enter refund amount in provider minor units (leave blank for full amount)",
        "",
      );

      let amount: number | undefined;
      if (amountInput !== null) {
        const trimmed = amountInput.trim();
        if (trimmed.length > 0) {
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            window.alert("Invalid amount provided. Refund cancelled.");
            return;
          }
          amount = Math.round(parsed);
        }
      }

      const companyKey = String(companyId);

      setRefundLoading((prev) => ({ ...prev, [payment.id]: true }));

      try {
        let company = companyCacheRef.current[companyKey];
        if (!company) {
          company = await apiClient.getCompany(companyKey);
          companyCacheRef.current[companyKey] = company;
        }

        const companyToken = company.apiToken?.trim();
        if (!companyToken) {
          window.alert("Company is missing an API token. Cannot process refund.");
          return;
        }

        const response = await apiClient.refundPayment({
          token,
          companyId: company.id,
          companyToken,
          amount,
        });

        window.alert(`Refund status: ${response.status}`);
        if (response.status === "REFUNDED") {
          onReload();
        }
      } catch (error) {
        window.alert(extractErrorMessage(error, "Refund request failed"));
      } finally {
        setRefundLoading((prev) => {
          const next = { ...prev };
          delete next[payment.id];
          return next;
        });
      }
    },
    [extractErrorMessage, onReload, refundLoading],
  );

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        header: "Payment ID",
        accessorKey: "id",
      },
      {
        header: "Buy order",
        accessorKey: "buyOrder",
      },
      {
        header: "Provider",
        accessorKey: "provider",
      },
      {
        header: "PSP reference",
        accessorKey: "token",
        cell: ({ row }) => <TokenCell token={row.original.token} />, 
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>
        ),
      },
      {
        header: "Amount",
        accessorKey: "amountMinor",
        cell: ({ row }) => formatCurrency(row.original.amountMinor, row.original.currency),
      },
      {
        header: "Environment",
        accessorKey: "environment",
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        header: "Updated",
        accessorKey: "updatedAt",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        header: "Actions",
        cell: ({ row }) => {
          const payment = row.original;
          if (payment.status !== "AUTHORIZED") {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          const isLoading = Boolean(refundLoading[payment.id]);

          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRefund(payment)}
              disabled={isLoading}
            >
              {isLoading ? "Refunding" : "Refund"}
            </Button>
          );
        },
      },
    ],
    [handleRefund, refundLoading],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const handleNext = () => {
    if (page < maxPage) onPageChange(page + 1);
  };

  return (
    <Card className="col-span-12">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
        <div className="text-xs text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
            No transactions for selected filters
          </div>
        ) : (
          <div className="flex h-[420px] flex-col">
            <div className="overflow-x-auto">
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="even:bg-muted/20">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-2 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <button
                className="rounded-md border border-input px-3 py-1 text-muted-foreground disabled:opacity-50"
                onClick={handlePrev}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>
                Page {page} of {maxPage}
              </span>
              <button
                className="rounded-md border border-input px-3 py-1 text-muted-foreground disabled:opacity-50"
                onClick={handleNext}
                disabled={page === maxPage}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TokenCell = ({ token }: { token: string | null | undefined }) => {
  if (!token) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const truncated = token.length > 18 ? `${token.slice(0, 8)}…${token.slice(-6)}` : token;

  const handleView = () => {
    window.alert(`PSP reference:\n${token}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">{truncated}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleView}
        aria-label="View PSP reference"
        title="View PSP reference"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
};
