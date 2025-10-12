export type ProviderType = "webpay" | "stripe" | "paypal";
export type PaymentStatus = "PENDING" | "AUTHORIZED" | "FAILED" | "CANCELED" | "REFUNDED";
export type RefundStatus = "REQUESTED" | "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "PARTIAL";
export type OrderStatus = "OPEN" | "COMPLETED" | "CANCELED" | "EXPIRED" | "PARTIAL" | "ABANDONED";
export type EnvironmentType = "test" | "live";
export type VerificationStatus = "pending" | "verified" | "failed" | "skipped";
export type DirectionType = "request" | "response";
export type OperationType =
  | "authorize"
  | "capture"
  | "refund"
  | "status"
  | "cancel"
  | "redirect"
  | "webhook"
  | "other";
export type ActorType = "system" | "provider" | "customer" | "merchant";

export type Role = "admin" | "viewer";

export type ServiceStatus = "operational" | "degraded" | "down";

export interface Company {
  id: string;
  name: string;
  contactEmail: string | null;
  apiToken: string | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
  taxId?: string | null;
  industry?: string | null;
  country?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Payment {
  id: string;
  paymentOrderId: string;
  buyOrder: string;
  provider: ProviderType;
  status: PaymentStatus;
  environment: EnvironmentType;
  amountMinor: number;
  currency: string;
  feeMinor?: number | null;
  feeCurrency?: string | null;
  providerAccountId: string | null;
  companyId?: string | null;
  token?: string | null;
  createdAt: string;
  updatedAt: string;
  statusReason?: string | null;
  authorizationCode?: string | null;
  responseCode?: string | null;
}

export interface PaymentOrder {
  id: string;
  buyOrder: string;
  environment: EnvironmentType;
  currency: string;
  amountExpectedMinor: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentStateHistoryEntry {
  id: string;
  paymentId: string;
  paymentOrderId?: string | null;
  buyOrder?: string | null;
  fromStatus?: PaymentStatus | null;
  toStatus: PaymentStatus;
  eventType?: string | null;
  actorType?: ActorType | null;
  reason?: string | null;
  createdAt: string;
  occurredAt: string;
  provider?: ProviderType | string | null;
}

export interface PaymentEventLog {
  id: string;
  paymentId: string | null;
  provider: ProviderType;
  operation: OperationType;
  direction: DirectionType;
  statusCode?: number | null;
  latencyMs?: number | null;
  createdAt: string;
}

export interface Dispute {
  id: string;
  paymentId: string | null;
  provider: ProviderType;
  reason: string | null;
  status: string | null;
  amountMinor: number | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  provider: ProviderType;
  status: RefundStatus;
  amountMinor: number;
  currency: string;
  buyOrder?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookInboxEntry {
  id: string;
  provider: ProviderType;
  verificationStatus: VerificationStatus;
  paymentId: string | null;
  receivedAt: string;
}

export interface ApiMetric {
  service: string;
  status: ServiceStatus;
  latencyP95: number;
  errorRate: number;
  throughput: number;
  updatedAt: string;
}

export interface TimeseriesPoint {
  timestamp: string;
  count: number;
  amountMinor: number;
  successRate: number;
  currency: string;
  providers?: Record<
    string,
    {
      total: number;
      authorized: number;
      successRate: number;
    }
  >;
}

export interface MetricsPayload {
  totalPayments: number;
  totalAmountMinor: number;
  totalAmountCurrency: string | null;
  activeCompanies: number;
  successRate: number;
  topPsp: ProviderType | null;
  timeseries: TimeseriesPoint[];
  pspDistribution: {
    provider: ProviderType;
    totalAmountMinor: number;
    count: number;
    currency: string | null;
  }[];
  totalsByCurrency: { currency: string; amountMinor: number; providers?: Record<string, number> }[];
  serviceHealth: ApiMetric[];
  statusCounts: Record<string, number>;
  providerCounts: Record<string, number>;
}

export interface StatusCheckEntry {
  id: string;
  paymentId: string | null;
  paymentOrderId: string | null;
  provider: ProviderType | string;
  requestedAt: string;
  success: boolean;
  providerStatus: string | null;
  mappedStatus: string | null;
  responseCode: number | null;
  errorMessage: string | null;
  rawPayload: unknown;
  createdAt: string;
}

export type CrmOperation =
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_PENDING"
  | "OTHER";

export type CrmQueueStatus = "PENDING" | "SENT" | "FAILED";

export interface CrmPushQueueEntry {
  id: string;
  paymentId: string | null;
  paymentOrderId: string | null;
  provider: ProviderType | string;
  operation: string;
  status: CrmQueueStatus | string;
  attempts: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  responseCode: number | null;
  crmId: string | null;
  lastError: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CrmEventLogEntry {
  id: string;
  paymentId: string | null;
  paymentOrderId: string | null;
  provider: ProviderType | string;
  operation: string;
  requestUrl: string | null;
  requestHeaders: unknown;
  requestBody: unknown;
  responseStatus: number | null;
  responseHeaders: unknown;
  responseBody: unknown;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface PaymentsHealthMetrics {
  totalPayments?: number;
  authorizedPayments?: number;
  totalAmountMinor?: number;
  totalAmountCurrency?: string | null;
  lastPaymentAt?: string | null;
  statusCounts?: Record<string, number>;
  statusCountsDisplay?: Record<string, number>;
  pendingByProvider?: Record<string, number>;
  last24h?: {
    count: number;
    amountMinor: number;
    currency?: string | null;
  };
}

export interface ServiceHealthSnapshot {
  id: string;
  label: string;
  status: ServiceStatus;
  rawStatus: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    connected: boolean;
    schema: string | null;
  };
  service: {
    environment: string | null;
    version: string | null;
    host: string | null;
    pid: number | null;
    defaultProvider: string | null;
  };
  payments: PaymentsHealthMetrics;
}

export interface HealthState {
  services: ServiceHealthSnapshot[];
  loading: boolean;
  error: string | null;
}

export interface FiltersState {
  dateRange: {
    from: string;
    to: string;
  };
  provider: ProviderType | "all";
  status: string | "all";
  environment: EnvironmentType | "all";
  buyOrder: string;
  paymentId: string;
  role: Role;
}

export interface StreamEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface MetricsState {
  data: MetricsPayload | null;
  loading: boolean;
  error: string | null;
}

export interface StreamState {
  events: StreamEvent[];
  connected: boolean;
  lastError: string | null;
}

export interface DashboardStore {
  filters: FiltersState;
  metrics: MetricsState;
  health: HealthState;
  stream: StreamState;
  setFilters: (filters: Partial<FiltersState>) => void;
  resetFilters: () => void;
  setMetrics: (metrics: Partial<MetricsState>) => void;
  setHealth: (metrics: Partial<HealthState>) => void;
  setStream: (stream: Partial<StreamState>) => void;
  pushEvent: (event: StreamEvent) => void;
}

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  nextOffset: number | null;
}
