import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type { ServiceHealthSnapshot } from "@/store/types/dashboard";

interface ServiceHealthProps {
  data: ServiceHealthSnapshot[];
  loading?: boolean;
  error?: string | null;
}

const statusIcon = {
  operational: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  degraded: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  down: <CircleDashed className="h-4 w-4 text-red-500" />,
} as const;

const statusLabel: Record<ServiceHealthSnapshot["status"], string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

export const ServiceHealth = ({ data, loading, error }: ServiceHealthProps) => (
  <Card className="col-span-12">
    <CardHeader>
      <CardTitle className="text-sm font-medium text-muted-foreground">Service health</CardTitle>
    </CardHeader>
    <CardContent>
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No health metrics available
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((snapshot) => {
            return (
              <div
                key={snapshot.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4"
                role="status"
                aria-label={`${snapshot.label} status ${statusLabel[snapshot.status]}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{snapshot.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDateTime(snapshot.timestamp)}
                    </p>
                  </div>
                  {statusIcon[snapshot.status]}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-semibold capitalize">{statusLabel[snapshot.status]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Uptime</dt>
                    <dd className="font-semibold">{formatDuration(snapshot.uptimeSeconds)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">DB schema</dt>
                    <dd className="font-semibold">
                      {snapshot.database.connected
                        ? snapshot.database.schema ?? "Connected"
                        : "Disconnected"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Environment</dt>
                    <dd className="font-semibold">
                      {snapshot.service.environment ?? "n/a"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Version</dt>
                    <dd className="font-semibold">
                      {snapshot.service.version ?? "n/a"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Host / PID</dt>
                    <dd className="font-semibold">
                      {snapshot.service.host ?? "n/a"}
                      {snapshot.service.pid ? ` · ${snapshot.service.pid}` : ""}
                    </dd>
                  </div>
                </dl>

                {/* <div className="rounded-md border border-border/40 bg-background/60 p-3 text-xs">
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Payments</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">
                        {payments.totalPayments ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Authorized</p>
                      <p className="font-semibold">
                        {payments.authorizedPayments ?? 0}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Volume</p>
                      <p className="font-semibold">
                        {formatCurrency(totalAmountMinor, totalAmountCurrency)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Last payment</p>
                      <p className="font-semibold">
                        {payments.lastPaymentAt ? formatDateTime(payments.lastPaymentAt) : "n/a"}
                      </p>
                    </div>
                  </div>
                  {last24h ? (
                    <div className="mt-3 flex justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2">
                      <div>
                        <p className="text-muted-foreground">Last 24h</p>
                        <p className="font-semibold">{last24h.count} payments</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Volume</p>
                        <p className="font-semibold">
                          {formatCurrency(
                            last24h.amountMinor ?? 0,
                            last24h.currency ?? totalAmountCurrency,
                          )}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {statusCounts && Object.keys(statusCounts).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-muted-foreground">By status</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(statusCounts).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full border border-border/50 bg-background px-2 py-0.5 text-[11px]"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {pendingByProvider && Object.keys(pendingByProvider).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-muted-foreground">Pending by provider</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(pendingByProvider).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full border border-border/50 bg-background px-2 py-0.5 text-[11px]"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div> */}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);
