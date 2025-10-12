import { useEffect, useMemo } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Topbar, type FiltersConfig } from "@/app/layout/Topbar";
import { Sidebar } from "@/app/layout/Sidebar";
import { I18nProvider } from "@/app/providers/I18nProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { OverviewPage } from "@/pages/OverviewPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { HealthPage } from "@/pages/HealthPage";
import { LoginPage } from "@/pages/LoginPage";
import { PaymentOrdersPage } from "@/pages/PaymentOrdersPage";
import { PaymentStateHistoryPage } from "@/pages/PaymentStateHistoryPage";
import { DisputesPage } from "@/pages/DisputesPage";
import { RefundsPage } from "@/pages/RefundsPage";
import { WebhooksPage } from "@/pages/WebhooksPage";
import { CompaniesPage } from "@/pages/CompaniesPage";
import { StatusChecksPage } from "@/pages/StatusChecksPage";
import { CrmPushQueuePage } from "@/pages/CrmPushQueuePage";
import { CrmEventLogsPage } from "@/pages/CrmEventLogsPage";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { isFeatureEnabled } from "@/lib/logger";
import { useDashboardStore } from "@/store";
import { selectAuthEmail, useAuthStore } from "@/store/auth";
import type { FiltersState, PaymentStatus, ProviderType } from "@/store/types/dashboard";

const providerOptions: ProviderType[] = ["webpay", "stripe", "paypal"];
const paymentStatusOptions: string[] = ["PENDING", "AUTHORIZED", "FAILED", "CANCELED", "REFUNDED"];
const statusCheckOptions: string[] = ["AUTHORIZED", "PENDING", "TO_CONFIRM"];
const orderStatusOptions: string[] = ["OPEN", "COMPLETED", "ABANDONED"];
const refundStatusOptions: string[] = ["REQUESTED", "PENDING", "SUCCEEDED", "FAILED", "CANCELED", "PARTIAL"];
const crmQueueStatusOptions: string[] = ["PENDING", "SENT", "FAILED"];

const DEFAULT_FILTER_CONFIG: FiltersConfig = {
  fields: ["dateRange", "buyOrder", "provider", "status"],
  statusOptions: paymentStatusOptions,
};

const getFilterConfig = (pathname: string): FiltersConfig => {
  if (pathname === "/health") {
    return { fields: [] };
  }
  if (pathname === "/") {
    return {
      fields: ["dateRange", "provider"],
    };
  }
  if (pathname.startsWith("/transactions")) {
    return {
      fields: ["dateRange", "buyOrder", "provider", "status"],
      statusOptions: paymentStatusOptions,
    };
  }
  if (pathname.startsWith("/orders")) {
    return {
      fields: ["dateRange", "buyOrder", "provider", "status"],
      statusOptions: orderStatusOptions,
      statusLabel: "Order status",
    };
  }
  if (pathname.startsWith("/history")) {
    return {
      fields: ["dateRange", "buyOrder", "provider", "status"],
      statusOptions: paymentStatusOptions,
      statusLabel: "State",
    };
  }
  if (pathname.startsWith("/refunds")) {
    return {
      fields: ["dateRange", "buyOrder", "provider", "status"],
      statusOptions: refundStatusOptions,
      statusLabel: "Refund status",
    };
  }
  if (pathname.startsWith("/webhooks")) {
    return {
      fields: ["dateRange", "provider", "paymentId"],
      paymentLabel: "Payment ID",
      paymentPlaceholder: "pay-123",
    };
  }
  if (pathname.startsWith("/companies")) {
    return {
      fields: [],
    };
  }
  if (pathname.startsWith("/status-checks")) {
    return {
      fields: ["dateRange", "provider", "status", "paymentId"],
      statusOptions: statusCheckOptions,
      statusLabel: "Mapped status",
      paymentLabel: "Payment ID",
      paymentPlaceholder: "pay-123",
    };
  }
  if (pathname.startsWith("/crm/push-queue")) {
    return {
      fields: ["dateRange", "provider", "status", "paymentId"],
      statusOptions: crmQueueStatusOptions,
      statusLabel: "Queue status",
      paymentLabel: "Payment ID",
      paymentPlaceholder: "pay-123",
    };
  }
  if (pathname.startsWith("/crm/event-logs")) {
    return {
      fields: ["dateRange", "provider", "paymentId"],
      paymentLabel: "Payment ID",
      paymentPlaceholder: "pay-123",
    };
  }
  if (pathname.startsWith("/disputes")) {
    return {
      fields: ["dateRange", "buyOrder", "provider", "status"],
      statusOptions: paymentStatusOptions,
    };
  }
  return DEFAULT_FILTER_CONFIG;
};

const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
    <span>{message}</span>
    <Button variant="destructive" size="sm" onClick={onRetry}>
      Retry
    </Button>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const {
    filters,
    metrics,
    health,
    payments,
    paymentsLoading,
    paymentsError,
    page,
    pageSize,
    totalPayments,
    setPage,
    reload,
    statusCounts,
    providerCounts,
    totalsByCurrency,
    providerAmounts,
    providerPaymentDetails,
    timeseries,
  } = useDashboardData();
  const streamEvents = useDashboardStore((state) => state.stream.events);
  const setFilters = useDashboardStore((state) => state.setFilters);
  const resetFilters = useDashboardStore((state) => state.resetFilters);
  const logout = useAuthStore((state) => state.logout);
  const authEmail = useAuthStore(selectAuthEmail);

  const filterConfig = useMemo(() => getFilterConfig(location.pathname), [location.pathname]);
  const exportEnabled = isFeatureEnabled("export-csv", true);

  const handleChangeFilters = (partial: Partial<FiltersState>) => {
    setFilters(partial);
  };

  const handleApplyFilters = () => {
    reload();
  };

  const handleResetFilters = () => {
    resetFilters();
    reload();
  };

  const handleExportCsv = () => {
    if (!payments.length) return;
    const header = [
      "id",
      "paymentOrderId",
      "buyOrder",
      "provider",
      "status",
      "amountMinor",
      "currency",
      "environment",
      "providerAccountId",
      "createdAt",
      "updatedAt",
    ];
    const rows = payments.map((payment) => [
      payment.id,
      payment.paymentOrderId,
      payment.buyOrder,
      payment.provider,
      payment.status,
      payment.amountMinor,
      payment.currency,
      payment.environment,
      payment.providerAccountId ?? "",
      payment.createdAt,
      payment.updatedAt,
    ]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const { provider, buyOrder, paymentId, status } = filters;

  useEffect(() => {
    const updates: Partial<FiltersState> = {};
    if (!filterConfig.fields.includes("provider") && provider !== "all") {
      updates.provider = "all";
    }
    if (!filterConfig.fields.includes("buyOrder") && buyOrder) {
      updates.buyOrder = "";
    }
    if (!filterConfig.fields.includes("paymentId") && paymentId) {
      updates.paymentId = "";
    }
    if (!filterConfig.fields.includes("status")) {
      if (status !== "all") {
        updates.status = "all";
      }
    } else if (filterConfig.statusOptions && status !== "all" && !filterConfig.statusOptions.includes(status)) {
      updates.status = "all";
    }

    if (Object.keys(updates).length > 0) {
      setFilters(updates);
    }
  }, [buyOrder, paymentId, provider, status, filterConfig, setFilters]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          filters={filters}
          onChangeFilters={handleChangeFilters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          onExportCsv={handleExportCsv}
          providers={providerOptions}
          statuses={paymentStatusOptions as PaymentStatus[]}
          exportEnabled={exportEnabled}
          filterConfig={filterConfig}
          onLogout={logout}
          userEmail={authEmail}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {paymentsError ? <ErrorBanner message={paymentsError} onRetry={reload} /> : null}
          <Routes>
            <Route
              path="/"
              element={
                <OverviewPage
                  metrics={metrics.data}
                  loading={metrics.loading}
                  timeseries={timeseries}
                  statusCounts={statusCounts}
                  providerCounts={providerCounts}
                  totalsByCurrency={totalsByCurrency}
                  providerAmounts={providerAmounts}
                  providerPaymentDetails={providerPaymentDetails}
                />
              }
            />
            <Route
              path="/transactions"
              element={
                <TransactionsPage
                  data={payments}
                  loading={paymentsLoading}
                  total={totalPayments}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onReload={reload}
                />
              }
            />
            <Route path="/orders" element={<PaymentOrdersPage />} />
            <Route path="/history" element={<PaymentStateHistoryPage />} />
            <Route path="/refunds" element={<RefundsPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/webhooks" element={<WebhooksPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/status-checks" element={<StatusChecksPage />} />
            <Route path="/crm/push-queue" element={<CrmPushQueuePage />} />
            <Route path="/crm/event-logs" element={<CrmEventLogsPage />} />
            <Route
              path="/health"
              element={
                <HealthPage
                  services={health.services}
                  healthLoading={health.loading}
                  healthError={health.error}
                  streamEvents={streamEvents}
                  eventsLoading={metrics.loading}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter basename="/dashboard">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/*" element={<AppContent />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
