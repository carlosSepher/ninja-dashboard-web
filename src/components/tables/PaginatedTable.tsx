import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface PaginatedColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface PaginatedTableProps<T> {
  title: string;
  items: T[];
  columns: PaginatedColumn<T>[];
  loading?: boolean;
  error?: string | null;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
  footerContent?: ReactNode;
}

export const PaginatedTable = <T,>({
  title,
  items,
  columns,
  loading = false,
  error,
  page,
  pageSize,
  total,
  onPageChange,
  emptyMessage = "No records for selected filters",
  footerContent,
}: PaginatedTableProps<T>) => {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < maxPage) onPageChange(page + 1);
  };

  return (
    <Card className="col-span-12">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-xs text-muted-foreground">
          Showing {total === 0 ? 0 : start}-{end} of {total}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {loading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : items.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.header}
                        className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground ${column.className ?? ""}`.trim()}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item, index) => (
                    <tr key={index} className="even:bg-muted/20">
                      {columns.map((column) => (
                        <td key={column.header} className={`px-4 py-2 text-sm ${column.className ?? ""}`.trim()}>
                          {column.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {footerContent ?? <span />}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-input px-3 py-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  onClick={handlePrev}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {maxPage}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-input px-3 py-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  onClick={handleNext}
                  disabled={page === maxPage}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
