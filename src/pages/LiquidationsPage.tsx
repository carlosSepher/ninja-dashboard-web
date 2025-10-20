import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/services/apiClient";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Company, Payment, ProviderType } from "@/store/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UI_PAGE_SIZE = 25;
const API_PAGE_SIZE = 25;

interface DateRange {
  from: string;
  to: string;
}

const getCurrentMonthRange = (): DateRange => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    from: firstDay.toISOString(),
    to: lastDay.toISOString(),
  };
};

const toIsoDate = (value: string, field: "from" | "to"): string | null => {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const date = new Date(
    year,
    month,
    day,
    field === "from" ? 0 : 23,
    field === "from" ? 0 : 59,
    field === "from" ? 0 : 59,
    field === "from" ? 0 : 999,
  );
  return date.toISOString();
};

const LiquidationsLayout = () => (
  <section className="col-span-12 flex flex-col gap-6">
    <Outlet />
  </section>
);

interface ProviderViewProps {
  provider: ProviderType;
}

const LiquidationsProviderView = ({ provider }: ProviderViewProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>(() => getCurrentMonthRange());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const companyNameMap = useMemo(
    () => Object.fromEntries(companies.map((company) => [company.id, company.name])),
    [companies],
  );

  useEffect(() => {
    let mounted = true;
    const loadCompanies = async () => {
      try {
        setCompaniesLoading(true);
        setCompanyError(null);
        const response = await apiClient.listCompanies({ page: 1, pageSize: 100 });
        if (!mounted) return;
        setCompanies(response.items);
        if (response.items.length > 0) {
          setSelectedCompanyId((current) => current ?? String(response.items[0].id));
        }
      } catch (err) {
        if (!mounted) return;
        setCompanyError((err as Error).message);
      } finally {
        if (!mounted) return;
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
    return () => {
      mounted = false;
    };
  }, []);

  const loadPayments = useCallback(async () => {
    if (!selectedCompanyId) {
      setPayments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const aggregated: Payment[] = [];
      const normalizedCompanyId =
        selectedCompanyId && /^\d+$/.test(selectedCompanyId) ? Number(selectedCompanyId) : selectedCompanyId;

      let currentPage = 1;
      let totalExpected = Infinity;

      while (aggregated.length < totalExpected) {
        const response = await apiClient.getPayments({
          from: dateRange.from,
          to: dateRange.to,
          provider,
          status: "AUTHORIZED",
          companyId: normalizedCompanyId,
          page: currentPage,
          pageSize: API_PAGE_SIZE,
        });

        aggregated.push(...response.items);
        totalExpected = response.count;

        if (aggregated.length >= response.count || response.items.length === 0) {
          break;
        }

        currentPage += 1;
      }

      const authorizedPayments = aggregated.filter(
        (payment) => (payment.status ?? "").toUpperCase() === "AUTHORIZED",
      );
      const uniquePayments = Array.from(
        new Map(authorizedPayments.map((payment) => [payment.id, payment])).values(),
      );
      setPayments(uniquePayments);
      setPage(1);
    } catch (err) {
      setError((err as Error).message);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to, provider, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    loadPayments();
  }, [selectedCompanyId, dateRange.from, dateRange.to, loadPayments]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(payments.length / UI_PAGE_SIZE));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, payments.length]);

  const currentItems = useMemo(
    () => payments.slice((page - 1) * UI_PAGE_SIZE, page * UI_PAGE_SIZE),
    [page, payments],
  );

  const totalsByCurrency = useMemo(() => {
    return payments.reduce<Record<string, number>>((acc, payment) => {
      const currency = payment.currency ?? "CLP";
      acc[currency] = (acc[currency] ?? 0) + payment.amountMinor;
      return acc;
    }, {});
  }, [payments]);

  const totalEntries = useMemo(() => Object.entries(totalsByCurrency), [totalsByCurrency]);
  const selectedCompanyName = selectedCompanyId ? companyNameMap[selectedCompanyId] ?? selectedCompanyId : null;
  const fromDateLabel = useMemo(
    () => new Date(dateRange.from).toLocaleDateString("es-CL"),
    [dateRange.from],
  );
  const toDateLabel = useMemo(
    () => new Date(dateRange.to).toLocaleDateString("es-CL"),
    [dateRange.to],
  );

  const columns = useMemo<PaginatedColumn<Payment>[]>(
    () => [
      { header: "Payment ID", render: (item) => item.id },
      { header: "Buy order", render: (item) => item.buyOrder },
      {
        header: "Company",
        render: (item) => (item.companyId ? companyNameMap[item.companyId] ?? item.companyId : "—"),
      },
      {
        header: "Created at",
        render: (item) => formatDateTime(item.createdAt),
      },
      {
        header: "Amount",
        className: "text-right",
        render: (item) => formatCurrency(item.amountMinor, item.currency),
      },
    ],
    [companyNameMap],
  );

  const handleDateChange = (field: "from" | "to", value: string) => {
    const iso = toIsoDate(value, field);
    if (!iso) return;
    setDateRange((current) => ({
      ...current,
      [field]: iso,
    }));
  };

  return (
    <div className="col-span-12 flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-dashed border-border bg-card/40 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`company-${provider}`}>
              Company
            </label>
            <Select
              id={`company-${provider}`}
              value={selectedCompanyId ?? ""}
              onChange={(event) => setSelectedCompanyId(event.target.value ? event.target.value : null)}
              disabled={companiesLoading || companies.length === 0}
            >
              <option value="" disabled>
                {companiesLoading ? "Cargando compañías..." : "Selecciona una compañía"}
              </option>
              {companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
                </option>
              ))}
            </Select>
            {companyError ? (
              <span className="text-xs text-destructive">
                No se pudieron cargar las compañías: {companyError}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`from-${provider}`}>
              Desde
            </label>
            <Input
              id={`from-${provider}`}
              type="date"
              value={dateRange.from.slice(0, 10)}
              max={dateRange.to.slice(0, 10)}
              onChange={(event) => handleDateChange("from", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`to-${provider}`}>
              Hasta
            </label>
            <Input
              id={`to-${provider}`}
              type="date"
              value={dateRange.to.slice(0, 10)}
              min={dateRange.from.slice(0, 10)}
              onChange={(event) => handleDateChange("to", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Pagos autorizados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-4xl font-semibold text-foreground">{payments.length}</div>
            <p className="text-sm text-muted-foreground">
              {selectedCompanyName ?? "Selecciona una compañía"} · {fromDateLabel} — {toDateLabel}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Total neto</CardTitle>
          </CardHeader>
          <CardContent>
            {totalEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : (
              <ul className="space-y-1 text-sm text-foreground">
                {totalEntries.map(([currency, amount]) => (
                  <li key={currency} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
                    <span className="uppercase text-muted-foreground">{currency}</span>
                    <span className="font-semibold">{formatCurrency(amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <PaginatedTable
        title={`Liquidaciones ${provider === "paypal" ? "Paypal" : "Webpay"}`}
        items={currentItems}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={UI_PAGE_SIZE}
        total={payments.length}
        onPageChange={setPage}
        emptyMessage="No hay pagos autorizados para los filtros seleccionados"
      />
    </div>
  );
};

export const LiquidationsPage = () => (
  <Routes>
    <Route element={<LiquidationsLayout />}>
      <Route index element={<Navigate to="webpay" replace />} />
      <Route path="webpay" element={<LiquidationsProviderView provider="webpay" />} />
      <Route path="paypal" element={<LiquidationsProviderView provider="paypal" />} />
    </Route>
  </Routes>
);
