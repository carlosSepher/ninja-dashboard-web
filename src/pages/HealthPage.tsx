import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceHealth } from "@/components/service/ServiceHealth";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceHealthSnapshot, StreamEvent } from "@/store/types/dashboard";

interface HealthPageProps {
  services: ServiceHealthSnapshot[];
  streamEvents: StreamEvent[];
  healthLoading: boolean;
  healthError?: string | null;
  eventsLoading: boolean;
}

export const HealthPage = ({
  services,
  streamEvents,
  healthLoading,
  healthError,
  eventsLoading,
}: HealthPageProps) => (
  <section className="grid grid-cols-12 gap-6">
    <ServiceHealth data={services} loading={healthLoading} error={healthError} />
    <Card className="col-span-12">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Live events</CardTitle>
        <Activity className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {eventsLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : streamEvents.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Waiting for events
          </div>
        ) : (
          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
            {streamEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-border/60 bg-card/60 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="uppercase">{event.type}</span>
                  <span>
                    {new Date(event.occurredAt).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/30 p-2 text-xs">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  </section>
);
