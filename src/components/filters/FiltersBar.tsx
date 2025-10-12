import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FiltersState, ProviderType } from "@/store/types/dashboard";

export type FilterField =
  | "dateRange"
  | "buyOrder"
  | "provider"
  | "status"
  | "environment"
  | "paymentId";

interface FiltersBarProps {
  filters: FiltersState;
  onChange: (filters: Partial<FiltersState>) => void;
  onApply: () => void;
  onReset: () => void;
  providerOptions: ProviderType[];
  statusOptions?: string[];
  visibleFields: FilterField[];
  statusLabel?: string;
  buyOrderLabel?: string;
  paymentLabel?: string;
  paymentPlaceholder?: string;
  showEnvironment?: boolean;
}

export const FiltersBar = ({
  filters,
  onChange,
  onApply,
  onReset,
  providerOptions,
  statusOptions,
  visibleFields,
  statusLabel = "Status",
  buyOrderLabel = "Buy order",
  paymentLabel = "Payment ID",
  paymentPlaceholder = "pay-123",
  showEnvironment = false,
}: FiltersBarProps) => {
  const hasField = (field: FilterField) => visibleFields.includes(field);

  const toIsoDate = (raw: string, field: "from" | "to") => {
    const [yearStr, monthStr, dayStr] = raw.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return null;
    }

    const timestamp = Date.UTC(
      year,
      month,
      day,
      field === "from" ? 0 : 23,
      field === "from" ? 0 : 59,
      field === "from" ? 0 : 59,
      field === "from" ? 0 : 999,
    );

    return new Date(timestamp).toISOString();
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    if (!hasField("dateRange")) return;
    if (!value) {
      onChange({
        dateRange: {
          ...filters.dateRange,
          [field]: filters.dateRange[field],
        },
      });
      return;
    }

    const isoValue = toIsoDate(value, field);
    if (!isoValue) return;
    onChange({
      dateRange: {
        ...filters.dateRange,
        [field]: isoValue,
      },
    });
  };

  const showStatus = hasField("status") && (statusOptions?.length ?? 0) > 0;
  const showProvider = hasField("provider");
  const showBuyOrder = hasField("buyOrder");
  const showPaymentId = hasField("paymentId");
  const showDateRange = hasField("dateRange");
  const showEnv = showEnvironment && hasField("environment");

  if (!showDateRange && !showProvider && !showStatus && !showBuyOrder && !showPaymentId && !showEnv) {
    return null;
  }

  const statusValue = showStatus
    ? filters.status
    : "all";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-dashed border-border bg-card/40 p-4">
      <div
        className={cn(
          "grid gap-4",
          "grid-cols-1 sm:grid-cols-2",
          (showDateRange ? 1 : 0) +
            (showBuyOrder ? 1 : 0) +
            (showProvider ? 1 : 0) +
            (showStatus ? 1 : 0) +
            (showPaymentId ? 1 : 0) +
            (showEnv ? 1 : 0) > 3
            ? "lg:grid-cols-3 xl:grid-cols-4"
            : "lg:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {showDateRange ? (
          <div className="grid gap-3 sm:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="from">
                  From
                </label>
                <Input
                  id="from"
                  type="date"
                  value={filters.dateRange.from.slice(0, 10)}
                  max={filters.dateRange.to.slice(0, 10)}
                  onChange={(event) => handleDateChange("from", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="to">
                  To
                </label>
                <Input
                  id="to"
                  type="date"
                  value={filters.dateRange.to.slice(0, 10)}
                  min={filters.dateRange.from.slice(0, 10)}
                  onChange={(event) => handleDateChange("to", event.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {showBuyOrder ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="buy-order">
              {buyOrderLabel}
            </label>
            <Input
              id="buy-order"
              placeholder="BO-1234"
              value={filters.buyOrder}
              onChange={(event) =>
                onChange({
                  buyOrder: event.target.value,
                })
              }
            />
          </div>
        ) : null}

        {showPaymentId ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="payment-id">
              {paymentLabel}
            </label>
            <Input
              id="payment-id"
              placeholder={paymentPlaceholder}
              value={filters.paymentId}
              onChange={(event) =>
                onChange({
                  paymentId: event.target.value,
                })
              }
            />
          </div>
        ) : null}

        {showProvider ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="provider">
              PSP
            </label>
            <Select
              id="provider"
              value={filters.provider}
              onChange={(event) =>
                onChange({
                  provider: event.target.value as FiltersState["provider"],
                })
              }
            >
              <option value="all">All PSPs</option>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {showStatus ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="status">
              {statusLabel}
            </label>
            <Select
              id="status"
              value={statusValue}
              onChange={(event) =>
                onChange({
                  status: event.target.value,
                })
              }
            >
              <option value="all">All statuses</option>
              {statusOptions?.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {showEnv ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="environment">
              Environment
            </label>
            <Select
              id="environment"
              value={filters.environment}
              onChange={(event) =>
                onChange({
                  environment: event.target.value as FiltersState["environment"],
                })
              }
            >
              <option value="all">All environments</option>
              <option value="test">test</option>
              <option value="live">live</option>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-end gap-2 sm:flex-row sm:justify-start">
        <button
          type="button"
          className="rounded-md border border-input bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          onClick={onApply}
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded-md border border-dashed border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
