import { LogOut, RotateCw } from "lucide-react";

import { FiltersBar, type FilterField } from "@/components/filters/FiltersBar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { FiltersState, PaymentStatus, ProviderType } from "@/store/types/dashboard";

export interface FiltersConfig {
  fields: FilterField[];
  statusOptions?: string[];
  statusLabel?: string;
  buyOrderLabel?: string;
  paymentLabel?: string;
  paymentPlaceholder?: string;
  showEnvironment?: boolean;
}

interface TopbarProps {
  filters: FiltersState;
  onChangeFilters: (filters: Partial<FiltersState>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  providers: ProviderType[];
  statuses: PaymentStatus[];
  filterConfig: FiltersConfig;
  onLogout?: () => void;
  userEmail?: string | null;
}

export const Topbar = ({
  filters,
  onChangeFilters,
  onApplyFilters,
  onResetFilters,
  providers,
  statuses,
  filterConfig,
  onLogout,
  userEmail,
}: TopbarProps) => (
  <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-semibold text-muted-foreground">Dashboard controls</h1>
        <div className="flex items-center gap-2">
          {userEmail ? <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span> : null}
          {onLogout ? (
            <Button
              variant="ghost"
              onClick={onLogout}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          ) : null}
          <Button variant="outline" onClick={onApplyFilters} className="flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
          <ThemeToggle />
        </div>
      </div>
      {filterConfig.fields.length > 0 ? (
        <FiltersBar
          filters={filters}
          onChange={onChangeFilters}
          onApply={onApplyFilters}
          onReset={onResetFilters}
          providerOptions={filterConfig.fields.includes("provider") ? providers : []}
          statusOptions={filterConfig.statusOptions ?? statuses}
          visibleFields={filterConfig.fields}
          statusLabel={filterConfig.statusLabel}
          buyOrderLabel={filterConfig.buyOrderLabel}
          paymentLabel={filterConfig.paymentLabel}
          paymentPlaceholder={filterConfig.paymentPlaceholder}
          showEnvironment={filterConfig.showEnvironment}
        />
      ) : null}
    </div>
  </header>
);
