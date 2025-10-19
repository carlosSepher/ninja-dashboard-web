import axios, { type AxiosInstance, isAxiosError } from "axios";

import type {
  ApiMetric,
  Company,
  CrmEventLogEntry,
  CrmPushQueueEntry,
  Dispute,
  MetricsPayload,
  PaginatedResult,
  Payment,
  PaymentOrder,
  PaymentStateHistoryEntry,
  PaymentsHealthMetrics,
  PaymentStatus,
  ProviderType,
  Refund,
  ServiceHealthSnapshot,
  StatusCheckEntry,
  StreamEvent,
  TimeseriesPoint,
  UserAccount,
  WebhookInboxEntry,
} from "@/store/types/dashboard";

export interface PaymentsQueryParams {
  from: string;
  to: string;
  provider?: ProviderType | "all" | null;
  status?: string | null;
  environment?: string | null;
  buyOrder?: string | null;
  page?: number;
  pageSize?: number;
}

export interface ListQueryParams {
  from: string;
  to: string;
  provider?: string | null;
  status?: string | null;
  environment?: string | null;
  buyOrder?: string | null;
  paymentId?: string | null;
  operation?: string | null;
  page?: number;
  pageSize?: number;
}

export interface CompaniesQueryParams {
  page?: number;
  pageSize?: number;
  search?: string | null;
  active?: boolean | null;
}

export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  search?: string | null;
}

export interface CompanyCreateInput {
  name: string;
  contactEmail: string;
  apiToken: string;
  active: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface CompanyUpdateInput {
  name?: string;
  contactEmail?: string;
  apiToken?: string;
  active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface UserCreateInput {
  email: string;
  password: string;
}

export interface UserUpdateInput {
  email?: string;
  password?: string;
}

export interface RefundPaymentInput {
  token: string;
  companyId: string | number;
  companyToken: string;
  amount?: number;
}

const isIsoCurrencyCode = (code: unknown): code is string =>
  typeof code === "string" && /^[A-Z]{3}$/.test(code.trim().toUpperCase());

const USE_MSW = import.meta.env.VITE_ENABLE_MSW === "true";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8200/api/v1";
const STATIC_API_TOKEN = import.meta.env.VITE_API_TOKEN ?? undefined;

const trimTrailingSlash = (value: string | null | undefined) =>
  value ? value.replace(/\/$/, "") : value;

const DEFAULT_EXEC_BASE = trimTrailingSlash(API_BASE_URL) ?? "";

const EXEC_HEALTH_URL =
  import.meta.env.VITE_EXECUTIVE_HEALTH_URL ??
  (DEFAULT_EXEC_BASE ? `${DEFAULT_EXEC_BASE}/health/metrics` : undefined);
const EXEC_HEALTH_TOKEN = import.meta.env.VITE_EXECUTIVE_HEALTH_TOKEN ?? STATIC_API_TOKEN;
const EXEC_SERVICE_NAME = import.meta.env.VITE_EXECUTIVE_SERVICE_NAME ?? "Executive API";

const PAYMENTS_HEALTH_URL = import.meta.env.VITE_PAYMENTS_HEALTH_URL ?? "";
const PAYMENTS_HEALTH_TOKEN = import.meta.env.VITE_PAYMENTS_HEALTH_TOKEN ?? undefined;
const PAYMENTS_SERVICE_NAME = import.meta.env.VITE_PAYMENTS_SERVICE_NAME ?? "Payments API";

const PAYMENTS_API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_PAYMENTS_API_BASE_URL ?? "http://127.0.0.1:8000/api",
);
const PAYMENTS_API_TOKEN = import.meta.env.VITE_PAYMENTS_API_TOKEN ?? "testtoken";

const CONCILIATOR_HEALTH_URL = import.meta.env.VITE_CONCILIATOR_HEALTH_URL ?? "";
const CONCILIATOR_HEALTH_TOKEN = import.meta.env.VITE_CONCILIATOR_HEALTH_TOKEN ?? undefined;
const CONCILIATOR_SERVICE_NAME = import.meta.env.VITE_CONCILIATOR_SERVICE_NAME ?? "Conciliator";

const baseURL = USE_MSW ? undefined : API_BASE_URL;

interface PaginatedApiResponse<T> {
  items: T[];
  count?: number;
  total?: number;
  total_count?: number;
  totalCount?: number;
  next_offset?: number | null;
  nextOffset?: number | null;
  meta?: {
    count?: number;
    total?: number;
    total_count?: number;
    totalCount?: number;
    next_offset?: number | null;
    nextOffset?: number | null;
  };
}

interface LegacyPaginatedApiResponse<T> {
  data: T[];
  total: number;
  next_offset?: number | null;
}

type AnyPaginatedResponse<T> = PaginatedApiResponse<T> | LegacyPaginatedApiResponse<T> | undefined;

interface PaymentApi {
  id: string | number;
  payment_order_id: string | number;
  buy_order: string;
  amount_minor: number;
  currency?: string | null;
  amount_currency?: string | null;
  provider: string;
  provider_account_id: string | number | null;
  environment: string;
  status: string;
  status_reason?: string | null;
  authorization_code?: string | null;
  response_code?: string | null;
  fee_minor?: number | null;
  fee_currency?: string | null;
  created_at: string;
  updated_at?: string;
}

type PaymentApiLike = PaymentApi & {
  paymentOrderId?: string | number;
  buyOrder?: string;
  amountMinor?: number;
  amount?: number;
  amountMajor?: number;
  totalAmount?: number;
  amountCurrency?: string | null;
  providerAccountId?: string | number | null;
  feeMinor?: number | null;
  feeCurrency?: string | null;
  createdAt?: string;
  updatedAt?: string;
  statusReason?: string | null;
  authorizationCode?: string | null;
  responseCode?: string | null;
  totalAmountMinor?: number | null;
  currencyCode?: string | null;
  company_id?: string | number | null;
  companyId?: string | number | null;
  provider_metadata?: unknown;
  providerMetadata?: unknown;
  token?: unknown;
  pspReference?: unknown;
  psp_reference?: unknown;
  payment_token?: unknown;
  paymentToken?: unknown;
  provider_token?: unknown;
  providerToken?: unknown;
  provider_reference?: unknown;
  providerReference?: unknown;
  order_id?: unknown;
  orderId?: unknown;
  session_id?: unknown;
  sessionId?: unknown;
  [key: string]: unknown;
};

interface StatusCheckApi {
  id: string | number;
  payment_id?: string | number | null;
  paymentId?: string | number | null;
  payment_order_id?: string | number | null;
  paymentOrderId?: string | number | null;
  provider?: string | null;
  requested_at?: string;
  requestedAt?: string;
  success?: boolean;
  provider_status?: string | null;
  providerStatus?: string | null;
  mapped_status?: string | null;
  mappedStatus?: string | null;
  response_code?: number | null;
  responseCode?: number | null;
  error_message?: string | null;
  errorMessage?: string | null;
  raw_payload?: unknown;
  rawPayload?: unknown;
  created_at?: string;
  createdAt?: string;
}

interface CrmPushQueueApi {
  id: string | number;
  payment_id?: string | number | null;
  paymentId?: string | number | null;
  payment_order_id?: string | number | null;
  paymentOrderId?: string | number | null;
  provider?: string | null;
  operation?: string | null;
  status?: string | null;
  attempts?: number | null;
  next_attempt_at?: string | null;
  nextAttemptAt?: string | null;
  last_attempt_at?: string | null;
  lastAttemptAt?: string | null;
  response_code?: number | null;
  crm_id?: string | number | null;
  crmId?: string | number | null;
  last_error?: string | null;
  lastError?: string | null;
  payload?: unknown;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface CrmEventLogApi {
  id: string | number;
  payment_id?: string | number | null;
  paymentId?: string | number | null;
  payment_order_id?: string | number | null;
  paymentOrderId?: string | number | null;
  provider?: string | null;
  operation?: string | null;
  request_url?: string | null;
  requestUrl?: string | null;
  request_headers?: unknown;
  requestHeaders?: unknown;
  request_body?: unknown;
  requestBody?: unknown;
  response_status?: number | null;
  responseStatus?: number | null;
  response_headers?: unknown;
  responseHeaders?: unknown;
  response_body?: unknown;
  responseBody?: unknown;
  error_message?: string | null;
  errorMessage?: string | null;
  latency_ms?: number | null;
  latencyMs?: number | null;
  created_at?: string;
  createdAt?: string;
}

const getCurrencyMinorFactor = (currencyCode: string | null | undefined): number => {
  if (!currencyCode) return 100;
  const normalized = currencyCode.trim().toUpperCase();
  if (normalized === "CLP") return 1;
  if (!isIsoCurrencyCode(normalized)) {
    return 100;
  }

  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
    });
    const { maximumFractionDigits } = formatter.resolvedOptions();
    const digits = maximumFractionDigits ?? 2;
    return 10 ** digits;
  } catch (error) {
    console.warn("Failed to resolve currency fraction digits", { currency: normalized, error });
    return 100;
  }
};

interface NormalizeAmountOptions {
  provider?: string | null;
  majorCandidates?: Array<unknown>;
}

const shouldNormalizeCurrency = (currency: string, provider?: string | null): boolean => {
  if (USE_MSW) return false;
  const normalizedCurrency = currency.toUpperCase();
  if (normalizedCurrency === "CLP") return false;
  if (provider && provider.toLowerCase() === "paypal") return true;
  return normalizedCurrency === "USD";
};

const normalizeAmountToMinorUnits = (
  rawValue: unknown,
  currency: string | null | undefined,
  options: NormalizeAmountOptions = {},
): number => {
  const numericValue = Number(rawValue ?? 0);
  if (!Number.isFinite(numericValue)) return 0;

  const normalizedCurrency = (currency ?? "CLP").trim().toUpperCase();
  const factor = getCurrencyMinorFactor(normalizedCurrency);

  if (USE_MSW) {
    return Math.round(numericValue);
  }

  if (factor === 1) {
    return Math.round(numericValue);
  }

  const scaledFromRaw = Math.round(numericValue * factor);

  const candidates = options.majorCandidates
    ?.map((candidate) => Number(candidate))
    .filter((candidate) => Number.isFinite(candidate) && Math.abs(candidate as number) > 0)
    .map((candidate) => Math.round(candidate * factor));

  if (candidates && candidates.length > 0) {
    const candidate = candidates.find((candidateValue) => Math.abs(candidateValue) >= Math.abs(scaledFromRaw));
    if (candidate !== undefined) {
      return candidate;
    }
  }

  if (!shouldNormalizeCurrency(normalizedCurrency, options.provider)) {
    return scaledFromRaw;
  }

  return scaledFromRaw;
};

interface PaymentOrderApi {
  id: string | number;
  buy_order: string;
  environment: string;
  currency: string;
  amount_expected_minor: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

type PaymentOrderApiLike = PaymentOrderApi & {
  buyOrder?: string;
  amountExpectedMinor?: number;
  createdAt?: string;
  updatedAt?: string;
  payment_id?: string | number | null;
  paymentId?: string | number | null;
};

interface PaymentStateHistoryApi {
  id: string | number;
  payment_id: string | number;
  payment_order_id?: string | number | null;
  buy_order?: string | null;
  provider?: string | null;
  from_status?: string | null;
  to_status: string;
  event_type?: string | null;
  actor_type?: string | null;
  reason?: string | null;
  created_at: string;
  updated_at?: string;
  occurred_at?: string;
}

type PaymentStateHistoryApiLike = PaymentStateHistoryApi & {
  paymentId?: string | number;
  paymentOrderId?: string | number | null;
  buyOrder?: string | null;
  provider?: string | null;
  fromStatus?: string | null;
  toStatus?: string;
  eventType?: string | null;
  actorType?: string | null;
  createdAt?: string;
  updatedAt?: string;
  occurred_at?: string;
  occurredAt?: string;
  timestamp?: string;
  time?: string;
};

interface RefundApi {
  id: string | number;
  payment_id: string | number;
  provider: string;
  status: string;
  amount_minor: number;
  currency?: string;
  amount_currency?: string;
  reason?: string | null;
  created_at: string;
  updated_at: string;
  buy_order?: string | null;
}

type RefundApiLike = RefundApi & {
  paymentId?: string | number;
  amountMinor?: number;
  amountCurrency?: string;
  createdAt?: string;
  updatedAt?: string;
  buyOrder?: string | null;
};

interface DisputeApi {
  id: string | number;
  payment_id: string | number | null;
  provider: string;
  reason: string | null;
  status: string | null;
  amount_minor: number | null;
  currency?: string | null;
  amount_currency?: string | null;
  created_at: string;
  updated_at: string;
}

type DisputeApiLike = DisputeApi & {
  paymentId?: string | number | null;
  amountMinor?: number | null;
  amountCurrency?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

interface WebhookInboxApi {
  id: string | number;
  provider: string;
  verification_status: string;
  payment_id: string | number | null;
  received_at: string;
  related_payment_id?: string | number | null;
  event_id?: string | null;
  event_type?: string | null;
  payload?: unknown;
}

type WebhookInboxApiLike = WebhookInboxApi & {
  verificationStatus?: string;
  paymentId?: string | number | null;
  receivedAt?: string;
  relatedPaymentId?: string | number | null;
  eventId?: string | null;
  eventType?: string | null;
};

interface UserAccountApi {
  id: string | number;
  email: string;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
}

type UserAccountApiLike = UserAccountApi;

interface CompanyApi {
  id: string | number;
  name: string;
  contact_email?: string | null;
  contactEmail?: string | null;
  api_token?: string | null;
  apiToken?: string | null;
  active?: boolean | null;
  metadata?: unknown;
  tax_id?: string | null;
  taxId?: string | null;
  industry?: string | null;
  country?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string | null;
  updatedAt?: string | null;
}

type CompanyApiLike = CompanyApi;

interface EventsLatestApiResponse {
  items?: StreamEventApi[];
  data?: StreamEventApi[];
  events?: StreamEventApi[];
}

interface MetricsApiResponse {
  totalPayments?: number;
  total_payments?: number;
  totalAmountMinor?: number;
  total_amount_minor?: number;
  activeCompanies?: number;
  active_companies?: number;
  successRate?: number;
  success_rate?: number;
  topPsp?: string | { provider?: string | null } | null;
  top_psp?: string | { provider?: string | null } | null;
  timeseries?: Array<Record<string, unknown>>;
  timeSeries?: Array<Record<string, unknown>>;
  time_series?: Array<Record<string, unknown>>;
  pspDistribution?: Array<Record<string, unknown>>;
  psp_distribution?: Array<Record<string, unknown>>;
  serviceHealth?: Array<Record<string, unknown>>;
  service_health?: Array<Record<string, unknown>>;
  statusCounts?: Record<string, unknown>;
  status_counts?: Record<string, unknown>;
  pspCounts?: Record<string, unknown>;
  psp_counts?: Record<string, unknown>;
  [key: string]: unknown;
}

interface StreamEventApi {
  id?: string | number;
  type?: string;
  payload?: unknown;
  occurred_at?: string;
  created_at?: string;
}

interface RawHealthResponse {
  status?: string;
  timestamp?: string;
  uptime_seconds?: number;
  uptimeSeconds?: number;
  service?: Record<string, unknown> | null;
  database?: Record<string, unknown> | null;
  payments?: Record<string, unknown> | null;
}

class ApiClient {
  private client: AxiosInstance;
  private unauthorizedHandler?: () => void;

  constructor() {
    this.client = axios.create({
      baseURL,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error) && error.response?.status === 401) {
          delete this.client.defaults.headers.common.Authorization;
          this.unauthorizedHandler?.();
        }
        return Promise.reject(error);
      },
    );
  }

  public setAuthToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common.Authorization;
    }
  }

  public onUnauthorized(handler: () => void) {
    this.unauthorizedHandler = handler;
  }

  public async getMetrics(params?: { from?: string; to?: string }): Promise<MetricsPayload> {
    const query = this.cleanQuery({
      from: params?.from,
      to: params?.to,
      start_date: params?.from,
      end_date: params?.to,
    });
    const { data } = await this.client.get<MetricsApiResponse | { data: MetricsApiResponse }>("/metrics", {
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    const payload = this.unwrapData(data);
    return this.normalizeMetrics(payload);
  }

  public async getPayments(params: PaymentsQueryParams): Promise<PaginatedResult<Payment>> {
    const { page = 1, pageSize = 25, from, to, provider, status, environment, buyOrder } = params;
    const response = await this.client.get<AnyPaginatedResponse<PaymentApi>>("/payments", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider && provider !== "all" ? provider : undefined,
          status: status ?? undefined,
          environment: environment ?? undefined,
          buy_order: buyOrder ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });

    const normalized = this.normalizePaginated(response.data);
    const result = this.toPaginatedResult(normalized, (item) => {
      return this.mapPayment(item);
    });
    return result;
  }

  public async getPaymentOrders(params: ListQueryParams): Promise<PaginatedResult<PaymentOrder>> {
    const { page = 1, pageSize = 25, from, to, status, environment, buyOrder } = params;
    const response = await this.client.get<AnyPaginatedResponse<PaymentOrderApi>>("/payment-orders", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          status: status ?? undefined,
          environment: environment ?? undefined,
          buy_order: buyOrder ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });
    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapPaymentOrder(item));
  }

  public async getPaymentStateHistory(
    params: ListQueryParams & { paymentId?: string | null },
  ): Promise<PaginatedResult<PaymentStateHistoryEntry>> {
    const { page = 1, pageSize = 25, from, to, status, paymentId, buyOrder } = params;
    const response = await this.client.get<AnyPaginatedResponse<PaymentStateHistoryApi>>("/payment-state-history", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          to_status: status ?? undefined,
          payment_id: paymentId ?? undefined,
          buy_order: buyOrder ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });
    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapPaymentStateHistory(item));
  }

  public async getDisputes(params: ListQueryParams): Promise<PaginatedResult<Dispute>> {
    const { page = 1, pageSize = 25, from, to, provider, status, buyOrder } = params;
    const response = await this.client.get<AnyPaginatedResponse<DisputeApi>>("/disputes", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider ?? undefined,
          status: status ?? undefined,
          buy_order: buyOrder ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });
    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapDispute(item));
  }

  public async getRefunds(params: ListQueryParams): Promise<PaginatedResult<Refund>> {
    const { page = 1, pageSize = 25, from, to, provider, status, buyOrder } = params;
    const response = await this.client.get<AnyPaginatedResponse<RefundApi>>("/refunds", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider ?? undefined,
          status: status ?? undefined,
          buy_order: buyOrder ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });
    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapRefund(item));
  }

  public async getWebhooks(params: ListQueryParams): Promise<PaginatedResult<WebhookInboxEntry>> {
    const { page = 1, pageSize = 25, from, to, provider, status, buyOrder, paymentId } = params;
    const response = await this.client.get<AnyPaginatedResponse<WebhookInboxApi>>("/webhook-inbox", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider ?? undefined,
          verification_status: status ?? undefined,
          buy_order: buyOrder ?? undefined,
          payment_id: paymentId ?? undefined,
          sort: "received_at",
          order: "desc",
          created_from: from,
          created_to: to,
        },
      ),
    });
    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapWebhook(item));
  }

  public async listUsers(params: UsersQueryParams = {}): Promise<PaginatedResult<UserAccount>> {
    const { page = 1, pageSize = 25, search } = params;
    const filters: Record<string, unknown> = {};
    if (typeof search === "string" && search.trim().length > 0) {
      filters.search = search.trim();
    }
    const response = await this.client.get<UserAccountApi[] | AnyPaginatedResponse<UserAccountApi>>("/users", {
      params: this.buildPaginatedQuery({ page, pageSize }, filters),
    });

    const data = response.data;
    if (Array.isArray(data)) {
      const start = Math.max(0, (page - 1) * pageSize);
      const slice = data.slice(start, start + pageSize).map((item) => this.mapUserAccount(item));
      return {
        items: slice,
        count: data.length,
        nextOffset: null,
      };
    }

    const normalized = this.normalizePaginated(data);
    return this.toPaginatedResult(normalized, (item) => this.mapUserAccount(item));
  }

  public async getUser(id: string): Promise<UserAccount> {
    const { data } = await this.client.get<UserAccountApi | { data: UserAccountApi }>(`/users/${id}`);
    const payload = this.unwrapData(data);
    return this.mapUserAccount(payload);
  }

  public async createUser(payload: UserCreateInput): Promise<UserAccount> {
    const body = {
      email: payload.email,
      password: payload.password,
    };
    const { data } = await this.client.post<UserAccountApi | { data: UserAccountApi }>("/users", body);
    const result = this.unwrapData(data);
    return this.mapUserAccount(result);
  }

  public async updateUser(id: string, payload: UserUpdateInput): Promise<UserAccount> {
    const body: Record<string, unknown> = {};
    if (payload.email !== undefined) body.email = payload.email;
    if (payload.password !== undefined) body.password = payload.password;
    const { data } = await this.client.patch<UserAccountApi | { data: UserAccountApi }>(`/users/${id}`, body);
    const result = this.unwrapData(data);
    return this.mapUserAccount(result);
  }

  public async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  public async listCompanies(params: CompaniesQueryParams = {}): Promise<PaginatedResult<Company>> {
    const { page = 1, pageSize = 25, search, active } = params;
    const response = await this.client.get<CompanyApi[] | AnyPaginatedResponse<CompanyApi>>("/companies", {
      params: this.buildPaginatedQuery(
        { page, pageSize },
        {
          search: search ?? undefined,
          active:
            typeof active === "boolean"
              ? String(active)
              : undefined,
        },
      ),
    });

    const data = response.data;
    if (Array.isArray(data)) {
      const start = Math.max(0, (page - 1) * pageSize);
      const slice = data.slice(start, start + pageSize).map((item) => this.mapCompany(item));
      return {
        items: slice,
        count: data.length,
        nextOffset: null,
      };
    }

    const normalized = this.normalizePaginated(data);
    return this.toPaginatedResult(normalized, (item) => this.mapCompany(item));
  }

  public async getCompany(id: string): Promise<Company> {
    const { data } = await this.client.get<CompanyApi | { data: CompanyApi }>(`/companies/${id}`);
    const payload = this.unwrapData(data);
    return this.mapCompany(payload);
  }

  public async createCompany(payload: CompanyCreateInput): Promise<Company> {
    const body = {
      name: payload.name,
      contactEmail: payload.contactEmail,
      apiToken: payload.apiToken,
      active: payload.active,
      metadata: payload.metadata ?? undefined,
    };
    const { data } = await this.client.post<CompanyApi | { data: CompanyApi }>("/companies", body);
    const result = this.unwrapData(data);
    return this.mapCompany(result);
  }

  public async updateCompany(id: string, payload: CompanyUpdateInput): Promise<Company> {
    const body: Record<string, unknown> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.contactEmail !== undefined) body.contactEmail = payload.contactEmail;
    if (payload.apiToken !== undefined) body.apiToken = payload.apiToken;
    if (payload.active !== undefined) body.active = payload.active;
    if (payload.metadata !== undefined) body.metadata = payload.metadata;
    const { data } = await this.client.patch<CompanyApi | { data: CompanyApi }>(`/companies/${id}`,
      body,
    );
    const result = this.unwrapData(data);
    return this.mapCompany(result);
  }

  public async deleteCompany(id: string): Promise<void> {
    await this.client.delete(`/companies/${id}`);
  }

  public async refundPayment(payload: RefundPaymentInput): Promise<{ status: PaymentStatus }> {
    const companyIdValue =
      typeof payload.companyId === "string" && /^\d+$/.test(payload.companyId)
        ? Number(payload.companyId)
        : payload.companyId;

    const entries: [string, unknown][] = [
      ["token", payload.token],
      ["company_id", companyIdValue],
      ["company_token", payload.companyToken],
    ];

    if (payload.amount !== undefined) {
      entries.push(["amount", payload.amount]);
    }

    const body = Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null));

    const paymentsBase = PAYMENTS_API_BASE_URL ?? "";
    const url = paymentsBase ? `${paymentsBase}/payments/refund` : "/payments/refund";

    const headers: Record<string, string> = {
      Authorization: `Bearer ${PAYMENTS_API_TOKEN}`,
    };

    const { data } = await this.client.post<{ status: PaymentStatus }>(url, body, { headers });
    return data;
  }

  public async getStatusChecks(
    params: ListQueryParams & { success?: boolean | null },
  ): Promise<PaginatedResult<StatusCheckEntry>> {
    const { page = 1, pageSize = 25, from, to, provider, paymentId, status, success } = params;
    const response = await this.client.get<AnyPaginatedResponse<StatusCheckApi>>("/status-checks", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider ?? undefined,
          payment_id: paymentId ?? undefined,
          mapped_status: status ?? undefined,
          success: typeof success === "boolean" ? success : undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });

    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapStatusCheck(item));
  }

  public async getCrmPushQueue(params: ListQueryParams): Promise<PaginatedResult<CrmPushQueueEntry>> {
    const { page = 1, pageSize = 25, from, to, provider, status, paymentId, operation } = params;
    const response = await this.client.get<AnyPaginatedResponse<CrmPushQueueApi>>("/crm/push-queue", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider ?? undefined,
          status: status ?? undefined,
          operation: operation ?? undefined,
          payment_id: paymentId ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });

    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapCrmPushQueue(item));
  }

  public async getCrmEventLogs(params: ListQueryParams): Promise<PaginatedResult<CrmEventLogEntry>> {
    const { page = 1, pageSize = 25, from, to, provider, status, paymentId, operation } = params;
    const response = await this.client.get<AnyPaginatedResponse<CrmEventLogApi>>("/crm/event-logs", {
      params: this.buildPaginatedQuery(
        { page, pageSize, from, to },
        {
          provider: provider ?? undefined,
          status: status ?? undefined,
          operation: operation ?? undefined,
          payment_id: paymentId ?? undefined,
          sort: "created_at",
          order: "desc",
        },
      ),
    });

    const normalized = this.normalizePaginated(response.data);
    return this.toPaginatedResult(normalized, (item) => this.mapCrmEventLog(item));
  }

  public async getLatestEvents(): Promise<StreamEvent[]> {
    try {
      const { data } = await this.client.get<EventsLatestApiResponse>("/events/latest");
      const items = this.extractCollection(data);
      return items.map((item) => this.mapStreamEvent(item as StreamEventApi));
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  public async getServicesHealth(): Promise<ServiceHealthSnapshot[]> {
    const tasks: Array<Promise<ServiceHealthSnapshot | null>> = [];

    if (EXEC_HEALTH_URL) {
      tasks.push(
        this.fetchHealthSnapshot({
          id: "executive",
          label: EXEC_SERVICE_NAME,
          url: EXEC_HEALTH_URL,
          token: EXEC_HEALTH_TOKEN,
        }),
      );
    }

    if (PAYMENTS_HEALTH_URL) {
      tasks.push(
        this.fetchHealthSnapshot({
          id: "payments",
          label: PAYMENTS_SERVICE_NAME,
          url: PAYMENTS_HEALTH_URL,
          token: PAYMENTS_HEALTH_TOKEN,
        }),
      );
    }

    if (CONCILIATOR_HEALTH_URL) {
      tasks.push(
        this.fetchHealthSnapshot({
          id: "conciliator",
          label: CONCILIATOR_SERVICE_NAME,
          url: CONCILIATOR_HEALTH_URL,
          token: CONCILIATOR_HEALTH_TOKEN,
        }),
      );
    }

    if (tasks.length === 0) return [];

    const snapshots = await Promise.all(tasks);
    return snapshots.filter((snapshot): snapshot is ServiceHealthSnapshot => snapshot !== null);
  }

  private mapPayment(item: PaymentApi): Payment {
    const raw = item as PaymentApiLike;

    const currency =
      raw.currency ??
      raw.amount_currency ??
      raw.amountCurrency ??
      raw.currencyCode ??
      "CLP";

    const amountMinor = normalizeAmountToMinorUnits(
      raw.amount_minor ?? raw.amountMinor ?? raw.totalAmountMinor ?? raw.amount ?? raw.totalAmount ?? 0,
      currency,
      {
        provider: raw.provider,
        majorCandidates: [raw.amount, raw.amountMajor, raw.totalAmount],
      },
    );

    const feeMinorRaw = raw.fee_minor ?? raw.feeMinor ?? null;
    const feeCurrency = raw.fee_currency ?? raw.feeCurrency ?? (feeMinorRaw != null ? currency : null);
    const feeMinor =
      feeMinorRaw === null || feeMinorRaw === undefined
        ? null
        : normalizeAmountToMinorUnits(feeMinorRaw, feeCurrency ?? currency, {
            provider: raw.provider,
          });

    const paymentOrderIdRaw = raw.payment_order_id ?? raw.paymentOrderId ?? raw.id;
    const providerAccountRaw = raw.provider_account_id ?? raw.providerAccountId ?? null;
    const providerAccountId =
      providerAccountRaw === null || providerAccountRaw === undefined
        ? null
        : String(providerAccountRaw);

    const companyIdRaw = raw.company_id ?? raw.companyId ?? null;
    const companyId =
      companyIdRaw === null || companyIdRaw === undefined ? null : String(companyIdRaw);

    const createdAt = raw.created_at ?? raw.createdAt ?? new Date().toISOString();
    const updatedAt = raw.updated_at ?? raw.updatedAt ?? createdAt;

    const providerMetadataRaw = this.coerceObject(raw.provider_metadata ?? raw.providerMetadata);
    const providerMetadata =
      providerMetadataRaw && typeof providerMetadataRaw === "object" && !Array.isArray(providerMetadataRaw)
        ? (providerMetadataRaw as Record<string, unknown>)
        : null;

    const directToken =
      this.normalizeIdentifier(
        raw.token ??
          raw["pspReference"] ??
          raw["psp_reference"] ??
          raw["payment_token"] ??
          raw["paymentToken"] ??
          raw["provider_token"] ??
          raw["providerToken"] ??
          raw["provider_reference"] ??
          raw["providerReference"] ??
          raw["order_id"] ??
          raw["orderId"] ??
          raw["session_id"] ??
          raw["sessionId"] ??
          null,
      ) ?? null;

    const metadataToken = providerMetadata
      ? this.normalizeIdentifier(
          providerMetadata.token ??
            providerMetadata.payment_token ??
            providerMetadata.provider_token ??
            providerMetadata.psp_reference ??
            providerMetadata.pspReference ??
            providerMetadata.session_id ??
            providerMetadata.order_id ??
            providerMetadata.reference ??
            null,
        )
      : null;

    const token = directToken ?? metadataToken;

    const result = {
      id: String(raw.id),
      paymentOrderId: String(paymentOrderIdRaw),
      buyOrder: (raw.buy_order ?? raw.buyOrder ?? "") as string,
      provider: raw.provider as ProviderType,
      status: raw.status as Payment["status"],
      environment: (raw.environment ?? "test") as Payment["environment"],
      amountMinor: Number.isFinite(amountMinor) ? amountMinor : 0,
      currency,
      feeMinor,
      feeCurrency,
      providerAccountId,
      createdAt,
      updatedAt,
      companyId,
      token,
      statusReason: raw.status_reason ?? raw.statusReason ?? null,
      authorizationCode: raw.authorization_code ?? raw.authorizationCode ?? null,
      responseCode: raw.response_code ?? raw.responseCode ?? null,
    };

    return result;
  }

  private mapPaymentOrder(item: PaymentOrderApi): PaymentOrder {
    const raw = item as PaymentOrderApiLike;
    const currency = raw.currency ?? "CLP";
    const paymentIdValue = raw.payment_id ?? raw.paymentId ?? null;
    return {
      id: String(raw.id),
      buyOrder: raw.buy_order ?? raw.buyOrder ?? "",
      paymentId:
        paymentIdValue === null || paymentIdValue === undefined ? null : String(paymentIdValue),
      environment: (raw.environment ?? "test") as PaymentOrder["environment"],
      currency,
      amountExpectedMinor: normalizeAmountToMinorUnits(
        raw.amount_expected_minor ?? raw.amountExpectedMinor ?? 0,
        currency,
        { provider: undefined },
      ),
      status: (raw.status ?? "PENDING") as PaymentOrder["status"],
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    };
  }

  private mapPaymentStateHistory(item: PaymentStateHistoryApi): PaymentStateHistoryEntry {
    const raw = item as PaymentStateHistoryApiLike;
    const paymentOrderIdValue = raw.payment_order_id ?? raw.paymentOrderId ?? null;
    const createdAtRaw = raw.created_at ?? raw.createdAt ?? raw.updated_at ?? raw.updatedAt ?? null;
    const occurredAtRaw =
      raw.occurred_at ??
      raw.occurredAt ??
      raw.timestamp ??
      raw.time ??
      createdAtRaw ??
      null;
    const createdAtValue = createdAtRaw ?? occurredAtRaw ?? new Date().toISOString();
    const occurredAtValue = occurredAtRaw ?? createdAtValue;
    return {
      id: String(raw.id),
      paymentId: String(raw.payment_id ?? raw.paymentId ?? raw.id),
      paymentOrderId:
        paymentOrderIdValue === undefined || paymentOrderIdValue === null
          ? null
          : String(paymentOrderIdValue),
      buyOrder: raw.buy_order ?? raw.buyOrder ?? null,
      provider: raw.provider ?? null,
      fromStatus: (raw.from_status ?? raw.fromStatus ?? null) as PaymentStateHistoryEntry["fromStatus"],
      toStatus: (raw.to_status ?? raw.toStatus ?? raw.from_status ?? raw.fromStatus ?? "UNKNOWN") as PaymentStateHistoryEntry["toStatus"],
      eventType: raw.event_type ?? raw.eventType ?? null,
      actorType: (raw.actor_type ?? raw.actorType ?? null) as PaymentStateHistoryEntry["actorType"],
      reason: raw.reason ?? null,
      createdAt: createdAtValue,
      occurredAt: occurredAtValue,
    };
  }

  private mapRefund(item: RefundApi): Refund {
    const raw = item as RefundApiLike;
    const currency = raw.currency ?? raw.amount_currency ?? raw.amountCurrency ?? "CLP";
    return {
      id: String(raw.id),
      paymentId: String(raw.payment_id ?? raw.paymentId ?? raw.id),
      provider: raw.provider as Refund["provider"],
      status: (raw.status ?? "PENDING") as Refund["status"],
      amountMinor: normalizeAmountToMinorUnits(
        raw.amount_minor ?? raw.amountMinor ?? 0,
        currency,
        { provider: raw.provider },
      ),
      currency,
      buyOrder: raw.buy_order ?? raw.buyOrder ?? null,
      reason: raw.reason ?? null,
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    };
  }

  private mapDispute(item: DisputeApi): Dispute {
    const raw = item as DisputeApiLike;
    const currency = raw.currency ?? raw.amount_currency ?? raw.amountCurrency ?? null;
    const amountRaw = raw.amount_minor ?? raw.amountMinor ?? null;
    return {
      id: String(raw.id),
      paymentId:
        raw.payment_id === null && raw.paymentId === undefined
          ? null
          : raw.payment_id === null || raw.paymentId === null
            ? null
            : String(raw.payment_id ?? raw.paymentId ?? ""),
      provider: raw.provider as Dispute["provider"],
      reason: raw.reason ?? null,
      status: raw.status ?? null,
      amountMinor:
        amountRaw === null || currency === null
          ? amountRaw
          : normalizeAmountToMinorUnits(amountRaw, currency, { provider: raw.provider }),
      currency,
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    };
  }

  private mapWebhook(item: WebhookInboxApi): WebhookInboxEntry {
    const raw = item as WebhookInboxApiLike;
    const payload = this.coerceObject(raw.payload);
    const paymentId =
      [
        raw.payment_id,
        raw.paymentId,
        raw.related_payment_id,
        raw.relatedPaymentId,
        this.extractPaymentIdFromWebhookPayload(payload),
      ]
        .map((candidate) => this.normalizeIdentifier(candidate))
        .find((candidate): candidate is string => candidate !== null) ?? null;
    return {
      id: String(raw.id),
      provider: raw.provider as WebhookInboxEntry["provider"],
      verificationStatus: (raw.verification_status ?? raw.verificationStatus ?? "pending") as WebhookInboxEntry["verificationStatus"],
      paymentId,
      receivedAt: raw.received_at ?? raw.receivedAt ?? new Date().toISOString(),
    };
  }

  private mapUserAccount(item: UserAccountApi): UserAccount {
    const raw = item as UserAccountApiLike;
    const normalizedEmail =
      typeof raw.email === "string" ? raw.email.trim() : String(raw.email ?? "");
    const fallbackEmail = normalizedEmail || `user-${String(raw.id)}`;
    return {
      id: String(raw.id),
      email: fallbackEmail,
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    };
  }

  private mapCompany(item: CompanyApi): Company {
    const raw = item as CompanyApiLike;
    const metadataRaw = this.coerceObject(raw.metadata);
    const metadata =
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? (metadataRaw as Record<string, unknown>)
        : null;

    const directTaxId = this.normalizeIdentifier(raw.taxId ?? raw.tax_id);
    const metadataTaxId = metadata ? this.normalizeIdentifier(metadata["tax_id"] ?? metadata["taxId"]) : null;
    const taxId = directTaxId ?? metadataTaxId;

    const industry =
      typeof raw.industry === "string" && raw.industry.trim() !== ""
        ? raw.industry
        : metadata
          ? this.pickString(metadata, ["industry", "sector", "line_of_business"]) ?? null
          : null;

    const country =
      typeof raw.country === "string" && raw.country.trim() !== ""
        ? raw.country
        : metadata
          ? this.pickString(metadata, ["country", "country_code"]) ?? null
          : null;

    const contactEmail = raw.contactEmail ?? raw.contact_email ?? null;
    const apiToken = raw.apiToken ?? raw.api_token ?? null;
    const activeRaw = raw.active;
    const active =
      typeof activeRaw === "boolean" ? activeRaw : activeRaw === undefined || activeRaw === null ? true : Boolean(activeRaw);

    return {
      id: String(raw.id),
      name: raw.name ?? "Unnamed company",
      contactEmail,
      apiToken,
      active,
      metadata,
      taxId,
      industry,
      country,
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    };
  }

  private extractPaymentIdFromWebhookPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;

    const record = payload as Record<string, unknown>;

    const directCandidates: unknown[] = [
      record["payment_id"],
      record["paymentId"],
      record["related_payment_id"],
      record["relatedPaymentId"],
    ];

    for (const candidate of directCandidates) {
      const normalized = this.normalizeIdentifier(candidate);
      if (normalized) return normalized;
    }

    const data = this.coerceObject(record["data"]);
    if (data && typeof data === "object") {
      const dataRecord = data as Record<string, unknown>;
      const object = this.coerceObject(dataRecord["object"]);
      if (object && typeof object === "object") {
        const objectRecord = object as Record<string, unknown>;
        const metadata = this.coerceObject(objectRecord["metadata"]);

        const metadataCandidates: unknown[] = [];
        if (metadata && typeof metadata === "object") {
          const metadataRecord = metadata as Record<string, unknown>;
          metadataCandidates.push(
            metadataRecord["payment_id"],
            metadataRecord["paymentId"],
            metadataRecord["buy_order"],
            metadataRecord["buyOrder"],
          );
        }

        const objectCandidates: unknown[] = [
          objectRecord["payment_id"],
          objectRecord["paymentId"],
          objectRecord["payment_intent"],
          objectRecord["paymentIntent"],
          objectRecord["order"],
        ];

        for (const candidate of [...metadataCandidates, ...objectCandidates]) {
          const normalized = this.normalizeIdentifier(candidate);
          if (normalized) return normalized;
        }

        const objectId = this.normalizeIdentifier(objectRecord["id"]);
        if (objectId) return objectId;
      }

      const dataId = this.normalizeIdentifier(dataRecord["id"]);
      if (dataId) return dataId;
    }

    return null;
  }

  private normalizeIdentifier(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const stringified = String(value).trim();
    return stringified.length > 0 ? stringified : null;
  }

  private mapStatusCheck(item: StatusCheckApi): StatusCheckEntry {
    const paymentIdRaw = item.payment_id ?? item.paymentId ?? null;
    const paymentOrderIdRaw = item.payment_order_id ?? item.paymentOrderId ?? null;
    const requestedAt = item.requested_at ?? item.requestedAt ?? item.created_at ?? item.createdAt ?? new Date().toISOString();
    const createdAt = item.created_at ?? item.createdAt ?? requestedAt;

    return {
      id: String(item.id),
      paymentId: paymentIdRaw === null || paymentIdRaw === undefined ? null : String(paymentIdRaw),
      paymentOrderId:
        paymentOrderIdRaw === null || paymentOrderIdRaw === undefined ? null : String(paymentOrderIdRaw),
      provider: (item.provider ?? "unknown") as ProviderType | string,
      requestedAt,
      success: Boolean(item.success),
      providerStatus: item.provider_status ?? item.providerStatus ?? null,
      mappedStatus: item.mapped_status ?? item.mappedStatus ?? null,
      responseCode: item.response_code ?? item.responseCode ?? null,
      errorMessage: item.error_message ?? item.errorMessage ?? null,
      rawPayload: this.coerceObject(item.raw_payload ?? item.rawPayload),
      createdAt,
    };
  }

  private mapCrmPushQueue(item: CrmPushQueueApi): CrmPushQueueEntry {
    const paymentIdRaw = item.payment_id ?? item.paymentId ?? null;
    const paymentOrderIdRaw = item.payment_order_id ?? item.paymentOrderId ?? null;
    const crmIdRaw = item.crm_id ?? item.crmId ?? null;
    const rawStatus = String(item.status ?? "PENDING").toUpperCase();
    const normalizedStatus = rawStatus === "SENDING" || rawStatus === "COMPLETED" ? "SENT" : rawStatus;

    return {
      id: String(item.id),
      paymentId: paymentIdRaw === null || paymentIdRaw === undefined ? null : String(paymentIdRaw),
      paymentOrderId:
        paymentOrderIdRaw === null || paymentOrderIdRaw === undefined ? null : String(paymentOrderIdRaw),
      provider: (item.provider ?? "unknown") as ProviderType | string,
      operation: item.operation ?? "UNKNOWN",
      status: (normalizedStatus as CrmPushQueueEntry["status"]) ?? "PENDING",
      attempts: Number(item.attempts ?? 0),
      nextAttemptAt: item.next_attempt_at ?? item.nextAttemptAt ?? null,
      lastAttemptAt: item.last_attempt_at ?? item.lastAttemptAt ?? null,
      responseCode: item.response_code ?? null,
      crmId: crmIdRaw === null || crmIdRaw === undefined ? null : String(crmIdRaw),
      lastError: item.last_error ?? item.lastError ?? null,
      payload: this.coerceObject(item.payload),
      createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
      updatedAt: item.updated_at ?? item.updatedAt ?? item.created_at ?? item.createdAt ?? new Date().toISOString(),
    };
  }

  private mapCrmEventLog(item: CrmEventLogApi): CrmEventLogEntry {
    const paymentIdRaw = item.payment_id ?? item.paymentId ?? null;
    const paymentOrderIdRaw = item.payment_order_id ?? item.paymentOrderId ?? null;

    return {
      id: String(item.id),
      paymentId: paymentIdRaw === null || paymentIdRaw === undefined ? null : String(paymentIdRaw),
      paymentOrderId:
        paymentOrderIdRaw === null || paymentOrderIdRaw === undefined ? null : String(paymentOrderIdRaw),
      provider: (item.provider ?? "unknown") as ProviderType | string,
      operation: item.operation ?? "UNKNOWN",
      requestUrl: item.request_url ?? item.requestUrl ?? null,
      requestHeaders: this.coerceObject(item.request_headers ?? item.requestHeaders),
      requestBody: this.coerceObject(item.request_body ?? item.requestBody),
      responseStatus: item.response_status ?? item.responseStatus ?? null,
      responseHeaders: this.coerceObject(item.response_headers ?? item.responseHeaders),
      responseBody: this.coerceObject(item.response_body ?? item.responseBody),
      errorMessage: item.error_message ?? item.errorMessage ?? null,
      latencyMs: item.latency_ms ?? item.latencyMs ?? null,
      createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    };
  }

  private mapStreamEvent(item: StreamEventApi): StreamEvent {
    const occurredAt = item.occurred_at ?? item.created_at ?? new Date().toISOString();
    const payload =
      item.payload && typeof item.payload === "object"
        ? (item.payload as Record<string, unknown>)
        : item.payload !== undefined
          ? { value: item.payload }
          : {};

    return {
      id: item.id ? String(item.id) : `${item.type ?? "event"}-${occurredAt}`,
      type: item.type ?? "event",
      payload,
      occurredAt,
    };
  }

  private unwrapData<T>(data: T | { data: T }): T {
    if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
      return (data as { data: T }).data;
    }
    return data as T;
  }

  private normalizeMetrics(raw: MetricsApiResponse | null | undefined): MetricsPayload {
    const totalPayments = Number(
      raw?.totalPayments ?? raw?.total_payments ?? raw?.total ?? raw?.count ?? 0,
    );
    const totalAmountMinorRaw = Number(
      raw?.totalAmountMinor ?? raw?.total_amount_minor ?? raw?.volume ?? 0,
    );
    const totalAmountCurrencyRaw =
      raw?.totalAmountCurrency ?? raw?.total_amount_currency ?? raw?.currency ?? null;
    const resolvedCurrency =
      typeof totalAmountCurrencyRaw === "string"
        ? totalAmountCurrencyRaw.trim().toUpperCase()
        : null;
    const totalAmountCurrency = isIsoCurrencyCode(resolvedCurrency) ? resolvedCurrency : null;
    const activeCompanies = Number(
      raw?.activeCompanies ?? raw?.active_companies ?? raw?.companies ?? 0,
    );
    const successRate = Number(raw?.successRate ?? raw?.success_rate ?? 0);

    const timeseries = this.normalizeTimeseries(raw, totalAmountCurrency ?? undefined);
    const distribution = this.normalizePspDistribution(raw, totalAmountCurrency ?? undefined);
    const topPsp = this.normalizeTopPsp(raw);
    const serviceHealth = this.normalizeServiceHealth(raw);
    const totalAmountMinor = normalizeAmountToMinorUnits(
      totalAmountMinorRaw,
      totalAmountCurrency ?? undefined,
    );

    const totalsByCurrency = this.normalizeTotalsByCurrency(
      raw,
      totalAmountMinor,
      totalAmountCurrency ?? undefined,
    );

    const rawStatusCounts = raw?.statusCounts ?? raw?.status_counts;
    const statusCounts =
      this.coerceRecord(rawStatusCounts) ??
      this.coerceCollection(rawStatusCounts, ["status", "key", "name", "id"], ["count", "value", "total"]);

    const rawProviderCounts = raw?.pspCounts ?? raw?.psp_counts;
    const providerCounts =
      this.coerceRecord(rawProviderCounts) ??
      this.coerceCollection(
        rawProviderCounts,
        ["provider", "psp", "name", "id"],
        ["count", "value", "total", "amount", "amountMinor"],
      );

    return {
      totalPayments: Number.isFinite(totalPayments) ? totalPayments : 0,
      totalAmountMinor,
      totalAmountCurrency,
      activeCompanies: Number.isFinite(activeCompanies) ? activeCompanies : 0,
      successRate: Number.isFinite(successRate) ? successRate : 0,
      topPsp,
      timeseries,
      pspDistribution: distribution,
      totalsByCurrency,
      serviceHealth,
      statusCounts: statusCounts ?? {},
      providerCounts: providerCounts ?? {},
    };
  }

  private normalizeTimeseries(
    raw: MetricsApiResponse | null | undefined,
    defaultCurrency?: string,
  ): TimeseriesPoint[] {
    const source = raw?.timeseries ?? raw?.timeSeries ?? raw?.time_series;
    if (!Array.isArray(source)) return [];

    return source
      .map((point): TimeseriesPoint | null => {
        const timestamp =
          point.timestamp ??
          point.date ??
          point.day ??
          point.bucket ??
          point.time ??
          null;
        if (!timestamp) return null;
        const count = Number(point.count ?? point.txCount ?? point.transactions ?? 0);
        const amountMinorRaw = Number(
          point.amountMinor ?? point.amount_minor ?? point.volume ?? point.total ?? 0,
        );
        const successRate = Number(
          point.successRate ?? point.success_rate ?? point.success ?? 0,
        );
        const currencyRaw = (
          point.currency ?? point.amountCurrency ?? point.currency_code ?? defaultCurrency ?? "CLP"
        ) as string;
        const currency = currencyRaw.trim().toUpperCase();
        const amountMinor = normalizeAmountToMinorUnits(amountMinorRaw, currency);
        const providers = this.normalizeTimeseriesProviders(point);
        return {
          timestamp: String(timestamp),
          count: Number.isFinite(count) ? count : 0,
          amountMinor: Number.isFinite(amountMinor) ? amountMinor : 0,
          successRate: Number.isFinite(successRate) ? successRate : 0,
          currency,
          providers,
        } as TimeseriesPoint;
      })
      .filter((value): value is TimeseriesPoint => value !== null);
  }

  private normalizePspDistribution(
    raw: MetricsApiResponse | null | undefined,
    defaultCurrency?: string,
  ): MetricsPayload["pspDistribution"] {
    const source = raw?.pspDistribution ?? raw?.psp_distribution;
    if (!Array.isArray(source)) return [];

    return source.map((item) => {
      const provider = String(item.provider ?? item.name ?? "unknown");
      const totalAmountRaw =
        item.totalAmountMinor ?? item.amountMinor ?? item.amount_minor ?? item.total ?? 0;
      const count = Number(item.count ?? item.txCount ?? item.transactions ?? 0);
      const currencyRaw = (
        item.currency ?? item.amountCurrency ?? item.currency_code ?? defaultCurrency ?? "CLP"
      ) as string;
      const currency = currencyRaw.trim().toUpperCase();
      const totalAmountMinor = normalizeAmountToMinorUnits(totalAmountRaw, currency, {
        provider,
        majorCandidates: [item.amount, item.totalAmount, item.volume],
      });

      return {
        provider: provider as ProviderType,
        totalAmountMinor: Number.isFinite(totalAmountMinor) ? totalAmountMinor : 0,
        count: Number.isFinite(count) ? count : 0,
        currency,
      };
    });
  }

  private normalizeTotalsByCurrency(
    raw: MetricsApiResponse | null | undefined,
    fallbackAmount: number,
    fallbackCurrency?: string,
  ): MetricsPayload["totalsByCurrency"] {
    const source =
      raw?.totalsByCurrency ??
      raw?.totals_by_currency ??
      raw?.totalAmounts ??
      raw?.total_amounts ??
      raw?.amountsByCurrency ??
      raw?.amounts_by_currency;

    if (Array.isArray(source) && source.length > 0) {
      return source
        .map((item) => {
          const currencyRaw = (item.currency ?? item.code ?? item.currency_code ?? fallbackCurrency ?? "CLP") as string;
          const currency = currencyRaw.trim().toUpperCase();
          const amountMinor = normalizeAmountToMinorUnits(
            item.amountMinor ?? item.amount_minor ?? item.total ?? item.value ?? 0,
            currency,
          );
          if (!isIsoCurrencyCode(currency)) return null;
          return {
            currency,
            amountMinor: Number.isFinite(amountMinor) ? amountMinor : 0,
          };
        })
        .filter((entry): entry is { currency: string; amountMinor: number } => entry !== null);
    }

    if (fallbackCurrency) {
      const normalizedFallback = fallbackCurrency.trim().toUpperCase();
      if (isIsoCurrencyCode(normalizedFallback)) {
        return [
          {
            currency: normalizedFallback,
            amountMinor: normalizeAmountToMinorUnits(fallbackAmount, normalizedFallback),
          },
        ];
      }
    }

    return [];
  }

  private normalizeTopPsp(raw: MetricsApiResponse | null | undefined): ProviderType | null {
    const candidate = raw?.topPsp ?? raw?.top_psp;
    if (!candidate) return null;
    if (typeof candidate === "string") return candidate as ProviderType;
    if (typeof candidate === "object" && candidate.provider) {
      return candidate.provider as ProviderType;
    }
    return null;
  }

  private normalizeServiceHealth(raw: MetricsApiResponse | null | undefined): ApiMetric[] {
    const source = raw?.serviceHealth ?? raw?.service_health;
    if (!Array.isArray(source)) return [];

    return source.map((entry) => {
      const latency = Number(entry.latencyP95 ?? entry.latency_p95 ?? entry.latency ?? 0);
      const errorRate = Number(entry.errorRate ?? entry.error_rate ?? entry.errors ?? 0);
      const throughput = Number(entry.throughput ?? entry.throughput_per_min ?? entry.rps ?? 0);
      const updatedAt =
        entry.updatedAt ?? entry.updated_at ?? entry.timestamp ?? new Date().toISOString();

      return {
        service: String(entry.service ?? entry.name ?? "unknown"),
        status: (entry.status ?? entry.state ?? "operational") as ApiMetric["status"],
        latencyP95: Number.isFinite(latency) ? latency : 0,
        errorRate: Number.isFinite(errorRate) ? errorRate : 0,
        throughput: Number.isFinite(throughput) ? throughput : 0,
        updatedAt: String(updatedAt),
      };
    });
  }

  private buildPaginatedQuery(
    base: { page?: number; pageSize?: number; from?: string; to?: string },
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const { page = 1, pageSize = 25, from, to } = base;
    const offset = Math.max(0, (page - 1) * pageSize);
    return this.cleanQuery({
      limit: pageSize,
      page,
      page_size: pageSize,
      pageSize,
      per_page: pageSize,
      offset,
      created_from: from,
      created_to: to,
      from,
      to,
      ...extra,
    });
  }

  private cleanQuery(params: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) =>
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ),
    );
  }

  private normalizePaginated<T>(data: AnyPaginatedResponse<T>): PaginatedApiResponse<T> {
    if (data && Array.isArray((data as PaginatedApiResponse<T>).items)) {
      const modern = data as PaginatedApiResponse<T>;
      const resolveFirstNumber = (...candidates: Array<number | null | undefined>) =>
        candidates.find(
          (value): value is number => typeof value === "number" && Number.isFinite(value),
        );
      const meta = modern.meta ?? (modern as { meta?: PaginatedApiResponse<T>["meta"] }).meta;
      const total =
        resolveFirstNumber(
          modern.count,
          modern.total,
          modern.total_count,
          modern.totalCount,
          meta?.count,
          meta?.total,
          meta?.total_count,
          meta?.totalCount,
        ) ?? modern.items.length;
      const nextOffsetCandidate =
        [
          modern.next_offset,
          modern.nextOffset,
          meta?.next_offset,
          meta?.nextOffset,
        ].find((value) => value !== undefined) ?? null;
      return {
        items: modern.items,
        count: Math.max(total, 0),
        next_offset: nextOffsetCandidate,
      };
    }

    if (data && Array.isArray((data as LegacyPaginatedApiResponse<T>).data)) {
      const legacy = data as LegacyPaginatedApiResponse<T>;
      return {
        items: legacy.data,
        count: legacy.total ?? legacy.data.length,
        next_offset: legacy.next_offset ?? null,
      };
    }

    return {
      items: [],
      count: 0,
      next_offset: null,
    };
  }

  private toPaginatedResult<T, U>(response: PaginatedApiResponse<T>, mapper: (item: T) => U): PaginatedResult<U> {
    return {
      items: response.items.map(mapper),
      count: response.count ?? response.items.length,
      nextOffset: response.next_offset ?? null,
    };
  }

  private extractCollection<T extends { items?: unknown[]; data?: unknown[]; events?: unknown[] }>(
    data: T | undefined,
  ): unknown[] {
    if (!data) return [];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray((data as { results?: unknown[] }).results)) {
      return (data as { results?: unknown[] }).results ?? [];
    }
    if (Array.isArray(data.events)) return data.events;
    return [];
  }

  private async fetchHealthSnapshot({
    id,
    label,
    url,
    token,
  }: {
    id: string;
    label: string;
    url: string;
    token?: string;
  }): Promise<ServiceHealthSnapshot | null> {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
      }

      const data = (await response.json()) as RawHealthResponse;
      return this.normalizeHealthSnapshot(id, label, data);
    } catch (error) {
      console.warn("Failed to load service health", { id, url, error: String(error) });
      return {
        id,
        label,
        status: "down",
        rawStatus: "error",
        timestamp: new Date().toISOString(),
        uptimeSeconds: 0,
        database: {
          connected: false,
          schema: null,
        },
        service: {
          environment: null,
          version: null,
          host: null,
          pid: null,
          defaultProvider: null,
        },
        payments: {},
      } satisfies ServiceHealthSnapshot;
    }
  }

  private normalizeHealthSnapshot(id: string, label: string, raw: RawHealthResponse): ServiceHealthSnapshot {
    const rawStatus = String(raw.status ?? "unknown");
    const status = this.mapHealthStatus(rawStatus);
    const timestamp = String(raw.timestamp ?? new Date().toISOString());
    const uptimeSeconds = Number(raw.uptime_seconds ?? raw.uptimeSeconds ?? 0);

    const serviceInfo = raw.service ?? {};
    const databaseInfo = raw.database ?? {};
    const paymentsInfo = raw.payments ?? {};

    return {
      id,
      label,
      status,
      rawStatus,
      timestamp,
      uptimeSeconds: Number.isFinite(uptimeSeconds) ? uptimeSeconds : 0,
      database: {
        connected: Boolean(databaseInfo.connected ?? false),
        schema: (databaseInfo.schema as string | null | undefined) ?? null,
      },
      service: {
        environment: (serviceInfo.environment as string | null | undefined) ?? null,
        version:
          this.pickFirstNonEmptyString(serviceInfo, [
            "version",
            "revision",
            "commit",
            "git_commit",
            "gitCommit",
            "git_sha",
            "gitSha",
            "release",
            "build",
            "build_sha",
            "buildSha",
          ]) ?? null,
        host: (serviceInfo.host as string | null | undefined) ?? null,
        pid: serviceInfo.pid !== undefined && serviceInfo.pid !== null ? Number(serviceInfo.pid) : null,
        defaultProvider: (serviceInfo.default_provider as string | null | undefined) ??
          (serviceInfo.defaultProvider as string | null | undefined) ??
          null,
      },
      payments: this.normalizePaymentsMetrics(paymentsInfo as Record<string, unknown>),
    };
  }

  private pickFirstNonEmptyString(
    source: Record<string, unknown> | null | undefined,
    keys: string[],
  ): string | null {
    if (!source) return null;
    for (const key of keys) {
      const value = source[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
        continue;
      }
      if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
        const stringified = String(value).trim();
        if (stringified.length > 0) {
          return stringified;
        }
      }
    }
    return null;
  }

  private mapHealthStatus(status: string): "operational" | "degraded" | "down" {
    const normalized = status.toLowerCase();
    if (normalized === "ok" || normalized === "operational") return "operational";
    if (normalized === "degraded") return "degraded";
    return "down";
  }

  private normalizePaymentsMetrics(raw: Record<string, unknown>): PaymentsHealthMetrics {
    const totalPayments = Number(
      raw.totalPayments ?? raw.total_payments ?? raw.count ?? 0,
    );
    const authorizedPayments = Number(
      raw.authorizedPayments ?? raw.authorized_payments ?? raw.authorized ?? 0,
    );
    const totalAmountMinorRaw = Number(
      raw.totalAmountMinor ?? raw.total_amount_minor ?? raw.amount_minor ?? 0,
    );
    const totalAmountCurrency =
      (raw.totalAmountCurrency ?? raw.total_amount_currency ?? null) as string | null;
    const totalAmountMinor = normalizeAmountToMinorUnits(
      totalAmountMinorRaw,
      totalAmountCurrency ?? undefined,
    );
    const lastPaymentAt =
      (raw.lastPaymentAt ?? raw.last_payment_at ?? null) as string | null;

    const statusCounts = this.coerceRecord(raw.statusCounts ?? raw.status_counts);
    const statusCountsDisplay = this.coerceRecord(
      raw.statusCountsDisplay ?? raw.status_counts_display,
    );
    const pendingByProvider = this.coerceRecord(
      raw.pendingByProvider ?? raw.pending_by_provider,
    );

    const last24hRaw = (raw.last24h ?? raw.last_24h) as Record<string, unknown> | undefined;
    const last24h = last24hRaw
      ? {
          count: Number(last24hRaw.count ?? 0),
          amountMinor: normalizeAmountToMinorUnits(
            last24hRaw.amountMinor ?? last24hRaw.amount_minor ?? 0,
            (last24hRaw.currency ?? totalAmountCurrency ?? undefined) as string | null | undefined,
          ),
          currency: (last24hRaw.currency ?? totalAmountCurrency ?? null) as string | null,
        }
      : undefined;

    return {
      totalPayments: Number.isFinite(totalPayments) ? totalPayments : undefined,
      authorizedPayments: Number.isFinite(authorizedPayments) ? authorizedPayments : undefined,
      totalAmountMinor: Number.isFinite(totalAmountMinor) ? totalAmountMinor : undefined,
      totalAmountCurrency,
      lastPaymentAt,
      statusCounts,
      statusCountsDisplay,
      pendingByProvider,
      last24h,
    };
  }

  private coerceObject(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        return parsed;
      } catch {
        return trimmed;
      }
    }
    return value;
  }

  private coerceRecord(value: unknown): Record<string, number> | undefined {
    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
        (acc, [key, entryValue]) => {
          const numeric = Number(entryValue ?? 0);
          acc[key] = Number.isFinite(numeric) ? numeric : 0;
          return acc;
        },
        {},
      );
    }
    return undefined;
  }

  private coerceCollection(
    value: unknown,
    keyCandidates: string[],
    valueCandidates: string[],
  ): Record<string, number> | undefined {
    if (!Array.isArray(value)) return undefined;

    const entries = (value as unknown[])
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const source = item as Record<string, unknown>;

        const key = keyCandidates
          .map((candidate) => source[candidate])
          .find((candidate) => typeof candidate === "string" && candidate.trim() !== "");

        if (!key) return null;

        const numericCandidate = valueCandidates
          .map((candidate) => source[candidate])
          .find((candidate) => candidate !== undefined && candidate !== null);

        const numericValue = Number(numericCandidate ?? 0);
        return [String(key), Number.isFinite(numericValue) ? numericValue : 0] as const;
      })
      .filter((entry): entry is readonly [string, number] => entry !== null);

    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries);
  }

  private normalizeTimeseriesProviders(point: Record<string, unknown>): TimeseriesPoint["providers"] {
    const candidateArrays = [
      point.providers,
      point.providerBreakdown,
      point.providersBreakdown,
      point.pspBreakdown,
      point.psp_breakdown,
      point.psp,
      point.psps,
    ].find((value): value is unknown[] => Array.isArray(value));

    const candidateRecord = [
      point.providerCounts,
      point.providers,
      point.pspCounts,
      point.psp_counts,
    ].find((value): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value));

    const stats: Record<string, { total: number; authorized: number; successRate: number }> = {};

    if (candidateArrays) {
      candidateArrays.forEach((rawItem) => {
        if (!rawItem || typeof rawItem !== "object") return;
        const item = rawItem as Record<string, unknown>;
        const provider = this.pickString(item, ["provider", "psp", "name", "id", "key"]);
        if (!provider) return;

        const total = this.pickNumber(item, ["total", "count", "transactions", "volume", "value"]) ?? 0;
        const authorized =
          this.pickNumber(item, ["authorized", "approved", "success", "authorizedCount"]) ?? undefined;
        let successRate = this.pickNumber(item, ["successRate", "conversion", "conversionRate", "approvedRate"]);

        const totalValue = Number.isFinite(total) ? Number(total) : 0;
        let authorizedValue =
          authorized !== undefined && Number.isFinite(authorized) ? Number(authorized) : undefined;
        let successRateValue =
          successRate !== undefined && Number.isFinite(successRate) ? Number(successRate) : undefined;

        if (successRateValue !== undefined && successRateValue <= 1) {
          successRateValue *= 100;
        }

        if (successRateValue === undefined && authorizedValue !== undefined && totalValue > 0) {
          successRateValue = (authorizedValue / totalValue) * 100;
        }

        if (successRateValue !== undefined && totalValue > 0 && authorizedValue === undefined) {
          const ratio = successRateValue / 100;
          authorizedValue = totalValue * ratio;
        }

        const authorizedFinal =
          authorizedValue !== undefined && Number.isFinite(authorizedValue)
            ? Math.round(authorizedValue)
            : 0;
        const successRateFinal =
          successRateValue !== undefined && Number.isFinite(successRateValue)
            ? Math.max(0, Math.min(100, successRateValue))
            : totalValue > 0
              ? (authorizedFinal / totalValue) * 100
              : 0;

        stats[provider] = {
          total: Math.round(totalValue),
          authorized: authorizedFinal,
          successRate: successRateFinal,
        };
      });
    }

    if (!candidateArrays && candidateRecord) {
      Object.entries(candidateRecord).forEach(([providerKey, rawValue]) => {
        const total = Number(rawValue ?? 0);
        stats[providerKey] = {
          total: Number.isFinite(total) ? total : 0,
          authorized: 0,
          successRate: 0,
        };
      });
    }

    return Object.keys(stats).length > 0 ? stats : undefined;
  }

  private pickNumber(source: Record<string, unknown>, candidates: string[]): number | undefined {
    for (const key of candidates) {
      const value = source[key];
      if (value === undefined || value === null) continue;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    return undefined;
  }

  private pickString(source: Record<string, unknown>, candidates: string[]): string | undefined {
    for (const key of candidates) {
      const value = source[key];
      if (typeof value === "string" && value.trim() !== "") {
        return value;
      }
    }
    return undefined;
  }
}

export const apiClient = new ApiClient();
