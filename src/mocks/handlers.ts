import { http, HttpResponse, delay } from "msw";

import {
  conciliatorHealth,
  crmEventLogs,
  crmPushQueue,
  disputes,
  executiveHealth,
  metricsSummary,
  paymentOrders,
  paymentStateHistory,
  payments,
  paymentsHealth,
  refunds,
  serviceMetrics,
  statusChecks,
  webhooks,
} from "@/mocks/data/fixtures";

const MOCK_LOGIN_EMAIL = "carlos@ninja.cl";
const MOCK_LOGIN_PASSWORD = "miClaveSuperSecreta";
const MOCK_API_TOKEN = import.meta.env.VITE_API_TOKEN ?? "mock-token";

interface ListQuery {
  limit?: number;
  offset?: number;
  created_from?: string | null;
  created_to?: string | null;
  provider?: string | null;
  status?: string | null;
  environment?: string | null;
  buy_order?: string | null;
  payment_id?: string | null;
  operation?: string | null;
}

const toNumber = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const matchesDateRange = (dateValue: string, from?: string | null, to?: string | null) => {
  const timestamp = new Date(dateValue).getTime();
  const fromTime = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return timestamp >= fromTime && timestamp <= toTime;
};

const paginate = <T>(items: T[], limit: number, offset: number) => {
  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + limit >= items.length ? null : offset + limit;
  return {
    items: slice,
    count: items.length,
    next_offset: nextOffset,
  };
};

const readListQuery = (request: Request): ListQuery => {
  const { searchParams } = new URL(request.url);
  return {
    limit: toNumber(searchParams.get("limit"), 25),
    offset: toNumber(searchParams.get("offset"), 0),
    created_from: searchParams.get("created_from"),
    created_to: searchParams.get("created_to"),
    provider: searchParams.get("provider"),
    status: searchParams.get("status"),
    environment: searchParams.get("environment"),
    buy_order: searchParams.get("buy_order"),
    payment_id: searchParams.get("payment_id") ?? searchParams.get("paymentId"),
    operation: searchParams.get("operation"),
  };
};

const events = paymentStateHistory.slice(0, 40).map((entry) => ({
  id: entry.id,
  type: "payment.history",
  payload: entry,
  occurred_at: entry.createdAt,
}));

export const handlers = [
  http.post("*/auth/login", async ({ request }) => {
    await delay(120);
    try {
      const payload = (await request.json()) as { email?: string; password?: string };
      if (
        payload.email?.toLowerCase() === MOCK_LOGIN_EMAIL &&
        payload.password === MOCK_LOGIN_PASSWORD
      ) {
        return HttpResponse.json({ accessToken: MOCK_API_TOKEN, tokenType: "bearer" });
      }
    } catch {
      return HttpResponse.json({ detail: "Invalid credentials" }, { status: 400 });
    }
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }),
  http.get("*/api/v1/metrics", async () => {
    await delay(200);
    return HttpResponse.json(metricsSummary);
  }),
  http.get("*/payments", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = payments
      .filter((payment) => matchesDateRange(payment.createdAt, query.created_from, query.created_to))
      .filter((payment) => (query.provider ? payment.provider === query.provider : true))
      .filter((payment) => (query.status ? payment.status === query.status : true))
      .filter((payment) => (query.environment ? payment.environment === query.environment : true))
      .filter((payment) =>
        query.buy_order ? payment.buyOrder.toLowerCase().includes(query.buy_order.toLowerCase()) : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(200);
    return HttpResponse.json(page);
  }),
  http.get("*/payment-orders", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = paymentOrders
      .filter((order) => matchesDateRange(order.createdAt, query.created_from, query.created_to))
      .filter((order) => (query.environment ? order.environment === query.environment : true))
      .filter((order) =>
        query.buy_order ? order.buyOrder.toLowerCase().includes(query.buy_order.toLowerCase()) : true,
      )
      .filter((order) => (query.status ? order.status === query.status : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(150);
    return HttpResponse.json(page);
  }),
  http.get("*/payment-state-history", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = paymentStateHistory
      .filter((entry) => matchesDateRange(entry.createdAt, query.created_from, query.created_to))
      .filter((entry) => (query.status ? entry.toStatus === query.status : true))
      .filter((entry) =>
        query.buy_order ? entry.buyOrder?.toLowerCase().includes(query.buy_order.toLowerCase()) : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 50, 200), Math.max(query.offset ?? 0, 0));
    await delay(120);
    return HttpResponse.json(page);
  }),
  http.get("*/disputes", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = disputes
      .filter((item) => matchesDateRange(item.createdAt, query.created_from, query.created_to))
      .filter((item) => (query.provider ? item.provider === query.provider : true))
      .filter((item) => (query.status ? item.status === query.status : true))
      .filter((item) =>
        query.buy_order
          ? item.paymentId?.toLowerCase().includes(query.buy_order.toLowerCase()) ?? false
          : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(180);
    return HttpResponse.json(page);
  }),
  http.get("*/refunds", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = refunds
      .filter((item) => matchesDateRange(item.createdAt, query.created_from, query.created_to))
      .filter((item) => (query.provider ? item.provider === query.provider : true))
      .filter((item) => (query.status ? item.status === query.status : true))
      .filter((item) =>
        query.buy_order ? item.buyOrder?.toLowerCase().includes(query.buy_order.toLowerCase()) ?? false : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(160);
    return HttpResponse.json(page);
  }),
  http.get("*/webhook-inbox", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = webhooks
      .filter((item) => matchesDateRange(item.receivedAt, query.created_from, query.created_to))
      .filter((item) => (query.provider ? item.provider === query.provider : true))
      .filter((item) =>
        query.payment_id
          ? item.paymentId?.toLowerCase().includes(query.payment_id.toLowerCase()) ?? false
          : true,
      )
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(140);
    return HttpResponse.json(page);
  }),
  http.get("*/status-checks", async ({ request }) => {
    const query = readListQuery(request);
    const { searchParams } = new URL(request.url);
    const successParam = searchParams.get("success");
    const filtered = statusChecks
      .filter((item) => matchesDateRange(item.createdAt, query.created_from, query.created_to))
      .filter((item) => (query.provider ? item.provider === query.provider : true))
      .filter((item) => (query.status ? (item.mappedStatus ?? "").toLowerCase() === query.status.toLowerCase() : true))
      .filter((item) =>
        query.payment_id
          ? (item.paymentId ?? "").toLowerCase().includes(query.payment_id.toLowerCase())
          : true,
      )
      .filter((item) =>
        successParam === null ? true : item.success === (successParam === "true" || successParam === "1"),
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(140);
    return HttpResponse.json(page);
  }),
  http.get("*/crm/push-queue", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = crmPushQueue
      .filter((item) => matchesDateRange(item.createdAt, query.created_from, query.created_to))
      .filter((item) => (query.provider ? item.provider === query.provider : true))
      .filter((item) => (query.status ? item.status === query.status : true))
      .filter((item) => (query.operation ? item.operation === query.operation : true))
      .filter((item) =>
        query.payment_id
          ? (item.paymentId ?? "").toLowerCase().includes(query.payment_id.toLowerCase())
          : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(160);
    return HttpResponse.json(page);
  }),
  http.get("*/crm/event-logs", async ({ request }) => {
    const query = readListQuery(request);
    const filtered = crmEventLogs
      .filter((item) => matchesDateRange(item.createdAt, query.created_from, query.created_to))
      .filter((item) => (query.provider ? item.provider === query.provider : true))
      .filter((item) => (query.operation ? item.operation === query.operation : true))
      .filter((item) =>
        query.payment_id
          ? (item.paymentId ?? "").toLowerCase().includes(query.payment_id.toLowerCase())
          : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const page = paginate(filtered, Math.min(query.limit ?? 25, 200), Math.max(query.offset ?? 0, 0));
    await delay(150);
    return HttpResponse.json(page);
  }),
  http.get("*/events/latest", async () => {
    await delay(100);
    return HttpResponse.json({ items: events });
  }),
  http.get("*/api/v1/health/metrics", async ({ request }) => {
    await delay(120);
    if (request.url.includes(":8300") || request.url.includes("conciliator")) {
      return HttpResponse.json(conciliatorHealth);
    }
    return HttpResponse.json(executiveHealth);
  }),
  http.get("*/conciliator-health", async () => {
    await delay(120);
    return HttpResponse.json(conciliatorHealth);
  }),
  http.get("*/health/metrics", async () => {
    await delay(120);
    return HttpResponse.json(paymentsHealth);
  }),
  http.get("*/service-health", async () => HttpResponse.json({ data: serviceMetrics })),
];
