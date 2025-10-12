export const DASHBOARD_DATA_REFRESH_ENABLED = false;
export const DASHBOARD_DATA_REFRESH_INTERVAL_MS = 15000;

export const DASHBOARD_HEALTH_REFRESH_ENABLED = true;
export const DASHBOARD_HEALTH_REFRESH_INTERVAL_MS = 10000;

export const DASHBOARD_REFRESH_INTERVAL_MS = DASHBOARD_DATA_REFRESH_INTERVAL_MS;
export const STREAM_RECONNECT_BASE_DELAY_MS = 2000;
export const STREAM_MAX_RECONNECT_DELAY_MS = 60000;

export const DEFAULT_DATE_RANGE_DAYS = 7;

export const SERVICES = [
  "executive-api",
  "payments-api",
  "conciliador",
  "webhooks",
  "psp-webpay",
  "psp-stripe",
  "psp-paypal",
] as const;

export type ServiceId = (typeof SERVICES)[number];
