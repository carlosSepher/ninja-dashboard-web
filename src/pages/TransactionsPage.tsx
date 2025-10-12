import { TransactionsTable } from "@/components/tables/TransactionsTable";
import type { Payment } from "@/store/types/dashboard";

interface TransactionsPageProps {
  data: Payment[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onReload: () => void;
}

export const TransactionsPage = ({
  data,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onReload,
}: TransactionsPageProps) => (
  <section className="grid grid-cols-12 gap-6">
    <TransactionsTable
      data={data}
      loading={loading}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onReload={onReload}
    />
  </section>
);
