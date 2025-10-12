import { addDays } from "date-fns";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

import { DEFAULT_DATE_RANGE_DAYS } from "@/lib/constants";
import {
  type DashboardStore,
  type MetricsState,
  type StreamState,
  type FiltersState,
  type StreamEvent,
  type HealthState,
} from "@/store/types/dashboard";

const buildDefaultFilters = (): FiltersState => {
  const to = new Date();
  const from = addDays(to, -DEFAULT_DATE_RANGE_DAYS);
  return {
    dateRange: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    provider: "all",
    status: "all",
    environment: "all",
    buyOrder: "",
    paymentId: "",
    role: "admin",
  };
};

const initialMetricsState: MetricsState = {
  data: null,
  loading: false,
  error: null,
};

const initialStreamState: StreamState = {
  events: [],
  connected: false,
  lastError: null,
};

const initialHealthState: HealthState = {
  services: [],
  loading: false,
  error: null,
};

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      filters: buildDefaultFilters(),
      metrics: initialMetricsState,
      health: initialHealthState,
      stream: initialStreamState,
      setFilters: (filters) =>
        set(
          (state) => ({
            filters: { ...state.filters, ...filters },
          }),
          false,
          "setFilters",
        ),
      resetFilters: () => set({ filters: buildDefaultFilters() }, false, "resetFilters"),
      setMetrics: (metrics) =>
        set((state) => ({ metrics: { ...state.metrics, ...metrics } }), false, "setMetrics"),
      setHealth: (health) =>
        set((state) => ({ health: { ...state.health, ...health } }), false, "setHealth"),
      setStream: (stream) =>
        set((state) => ({ stream: { ...state.stream, ...stream } }), false, "setStream"),
      pushEvent: (event: StreamEvent) =>
        set(
          (state) => ({
            stream: {
              ...state.stream,
              events: [event, ...state.stream.events].slice(0, 100),
            },
          }),
          false,
          "pushEvent",
        ),
    })),
  ),
);

export const selectFilters = (state: DashboardStore) => state.filters;
export const selectMetrics = (state: DashboardStore) => state.metrics;
export const selectHealth = (state: DashboardStore) => state.health;
export const selectStream = (state: DashboardStore) => state.stream;
