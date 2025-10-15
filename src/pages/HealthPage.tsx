import { ServiceHealth } from "@/components/service/ServiceHealth";
import type { ServiceHealthSnapshot, StreamEvent } from "@/store/types/dashboard";

interface HealthPageProps {
  services: ServiceHealthSnapshot[];
  streamEvents: StreamEvent[];
  healthLoading: boolean;
  healthError?: string | null;
  eventsLoading: boolean;
  streamConnected: boolean;
  streamError?: string | null;
}

export const HealthPage = ({
  services,
  streamEvents: _streamEvents,
  healthLoading,
  healthError,
  eventsLoading: _eventsLoading,
  streamConnected: _streamConnected,
  streamError: _streamError,
}: HealthPageProps) => (
  <section className="grid grid-cols-12 gap-6">
    <ServiceHealth data={services} loading={healthLoading} error={healthError} />
    {/*
      TODO: Re-enable live events panel.
      <Card className="col-span-12">
        ...
      </Card>
    */}
  </section>
);
