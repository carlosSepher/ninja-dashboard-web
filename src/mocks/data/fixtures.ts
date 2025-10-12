import { addMinutes, subDays } from "date-fns";
import { nanoid } from "nanoid/non-secure";

import type {
  ApiMetric,
  Company,
  Dispute,
  MetricsPayload,
  Payment,
  PaymentOrder,
  PaymentStateHistoryEntry,
  ProviderType,
  Refund,
  TimeseriesPoint,
  WebhookInboxEntry,
} from "@/store/types/dashboard";

const providers: ProviderType[] = ["webpay", "stripe", "paypal"];
const paymentStatuses = ["PENDING", "AUTHORIZED", "FAILED", "CANCELED", "REFUNDED"] as const;
const environments = ["test", "live"] as const;

const base = new Date();

export const companies: Company[] = [
  {
    id: "cmp-1",
    name: "Kiosko Digital",
    contactEmail: "ops@kiosko.digital",
    apiToken: "kiosko-token",
    active: true,
    metadata: {
      tax_id: "76876543-2",
      industry: "Retail",
      country: "CL",
    },
    taxId: "76876543-2",
    industry: "Retail",
    country: "CL",
    createdAt: subDays(base, 240).toISOString(),
    updatedAt: subDays(base, 60).toISOString(),
  },
  {
    id: "cmp-2",
    name: "Banca Futura",
    contactEmail: "finanzas@bancafutura.cl",
    apiToken: "bancafutura-token",
    active: true,
    metadata: {
      tax_id: "76111222-9",
      industry: "Fintech",
      country: "CL",
    },
    taxId: "76111222-9",
    industry: "Fintech",
    country: "CL",
    createdAt: subDays(base, 365).toISOString(),
    updatedAt: subDays(base, 30).toISOString(),
  },
  {
    id: "cmp-3",
    name: "Educa360",
    contactEmail: "admin@educa360.pe",
    apiToken: "educa360-token",
    active: false,
    metadata: {
      tax_id: "96555111-4",
      industry: "Education",
      country: "PE",
    },
    taxId: "96555111-4",
    industry: "Education",
    country: "PE",
    createdAt: subDays(base, 120).toISOString(),
    updatedAt: subDays(base, 15).toISOString(),
  },
  {
    id: "cmp-4",
    name: "Logisti.co",
    contactEmail: "contact@logisti.co",
    apiToken: "logistico-token",
    active: true,
    metadata: {
      tax_id: "90122333-7",
      industry: "Logistics",
      country: "MX",
    },
    taxId: "90122333-7",
    industry: "Logistics",
    country: "MX",
    createdAt: subDays(base, 80).toISOString(),
    updatedAt: subDays(base, 8).toISOString(),
  },
];

export const payments: Payment[] = Array.from({ length: 420 }).map((_, index) => {
  const provider = providers[index % providers.length];
  const status = paymentStatuses[(index + 2) % paymentStatuses.length];
  const environment = environments[index % environments.length];
  const createdAt = addMinutes(subDays(base, index % 14), index % 1 === 0 ? index : index * 2);
  const amountMinor = 1000 * (50 + (index % 40));
  const currency = index % 5 === 0 ? "USD" : "CLP";
  const feeMinor = Math.round(amountMinor * 0.015);
  const paymentOrderId = `ord-${Math.floor(index / 2)}`;
  const buyOrder = `BO-${Math.floor(index / 2).toString().padStart(5, "0")}`;

  return {
    id: `pay-${index}`,
    paymentOrderId,
    buyOrder,
    provider,
    status,
    environment,
    amountMinor,
    currency,
    feeMinor,
    feeCurrency: currency,
    providerAccountId: index % 5 === 0 ? `acct-${(index % 12) + 1}` : null,
    companyId: companies[index % companies.length]?.id ?? null,
    token: `tok-${index}`,
    createdAt: createdAt.toISOString(),
    updatedAt: addMinutes(createdAt, 5).toISOString(),
    statusReason: status === "FAILED" ? "Provider declined" : null,
    authorizationCode: status === "AUTHORIZED" ? `AUTH-${nanoid(6)}` : null,
    responseCode: status === "FAILED" ? "05" : "00",
  } satisfies Payment;
});

const ordersMap = new Map<string, PaymentOrder>();
payments.forEach((payment) => {
  const record = ordersMap.get(payment.paymentOrderId);
  if (!record) {
    ordersMap.set(payment.paymentOrderId, {
      id: payment.paymentOrderId,
      buyOrder: payment.buyOrder,
      environment: payment.environment,
      currency: payment.currency,
      amountExpectedMinor: Math.round(payment.amountMinor * 1.05),
      status: payment.status === "AUTHORIZED" ? "COMPLETED" : "OPEN",
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } else {
    record.amountExpectedMinor = Math.max(record.amountExpectedMinor, payment.amountMinor);
    record.status = payment.status === "AUTHORIZED" ? "COMPLETED" : record.status;
    record.updatedAt = payment.updatedAt;
  }
});

export const paymentOrders: PaymentOrder[] = Array.from(ordersMap.values());

export const paymentStateHistory: PaymentStateHistoryEntry[] = payments.flatMap((payment, idx) => {
  const createdAt = new Date(payment.createdAt);
  const baseEntry: PaymentStateHistoryEntry = {
    id: `hist-${payment.id}-0`,
    paymentId: payment.id,
    paymentOrderId: payment.paymentOrderId,
    buyOrder: payment.buyOrder,
    provider: payment.provider,
    fromStatus: null,
    toStatus: "PENDING",
    eventType: "CREATED",
    actorType: "system",
    reason: null,
    createdAt: subDays(createdAt, 1).toISOString(),
    occurredAt: subDays(createdAt, 1).toISOString(),
  };

  const transition: PaymentStateHistoryEntry = {
    id: `hist-${payment.id}-1`,
    paymentId: payment.id,
    paymentOrderId: payment.paymentOrderId,
    buyOrder: payment.buyOrder,
    provider: payment.provider,
    fromStatus: "PENDING",
    toStatus: payment.status,
    eventType: payment.status === "FAILED" ? "FAILED" : "STATUS",
    actorType: payment.status === "FAILED" ? "provider" : "system",
    reason: payment.status === "FAILED" ? "DECLINED" : null,
    createdAt: addMinutes(createdAt, 5).toISOString(),
    occurredAt: addMinutes(createdAt, 5).toISOString(),
  };

  const maybeRefund: PaymentStateHistoryEntry | null = idx % 45 === 0
    ? {
        id: `hist-${payment.id}-2`,
        paymentId: payment.id,
        paymentOrderId: payment.paymentOrderId,
        buyOrder: payment.buyOrder,
        provider: payment.provider,
        fromStatus: payment.status,
        toStatus: "REFUNDED",
        eventType: "REFUND",
        actorType: "provider",
        reason: "customer_refund",
        createdAt: addMinutes(createdAt, 60).toISOString(),
        occurredAt: addMinutes(createdAt, 60).toISOString(),
      }
    : null;

  return maybeRefund ? [baseEntry, transition, maybeRefund] : [baseEntry, transition];
});

export const refunds: Refund[] = payments
  .filter((_, idx) => idx % 17 === 0)
  .map((payment) => ({
    id: `rfd-${payment.id}`,
    paymentId: payment.id,
    provider: payment.provider,
    status: "SUCCEEDED",
    amountMinor: Math.round(payment.amountMinor * 0.7),
    currency: payment.currency,
    buyOrder: payment.buyOrder,
    reason: "Customer requested",
    createdAt: addMinutes(new Date(payment.createdAt), 90).toISOString(),
    updatedAt: addMinutes(new Date(payment.createdAt), 180).toISOString(),
  }));

export const disputes: Dispute[] = payments
  .filter((_, idx) => idx % 23 === 0)
  .map((payment, idx) => ({
    id: `dsp-${payment.id}`,
    paymentId: payment.id,
    provider: payment.provider,
    reason: "CARDHOLDER_DISPUTE",
    status: idx % 2 === 0 ? "OPEN" : "PENDING",
    amountMinor: Math.round(payment.amountMinor * 0.6),
    currency: payment.currency,
    createdAt: addMinutes(new Date(payment.createdAt), 1440).toISOString(),
    updatedAt: addMinutes(new Date(payment.createdAt), 2880).toISOString(),
  }));

export const webhooks: WebhookInboxEntry[] = payments
  .filter((_, idx) => idx % 11 === 0)
  .map((payment, idx) => ({
    id: `wh-${payment.id}`,
    provider: payment.provider,
    verificationStatus: idx % 3 === 0 ? "verified" : idx % 3 === 1 ? "pending" : "failed",
    paymentId: payment.id,
    receivedAt: addMinutes(new Date(payment.createdAt), 10).toISOString(),
  }));

const aggregateByTimestamp = (): TimeseriesPoint[] => {
  const grouped = new Map<
    string,
    {
      count: number;
      amountMinor: number;
      success: number;
      currency: string;
      providers: Map<string, { total: number; authorized: number }>;
    }
  >();
  payments.forEach((payment) => {
    const hourBucket = new Date(payment.createdAt);
    hourBucket.setMinutes(0, 0, 0);
    const key = hourBucket.toISOString();
    const entry = grouped.get(key) ?? {
      count: 0,
      amountMinor: 0,
      success: 0,
      currency: payment.currency,
      providers: new Map(),
    };
    entry.count += 1;
    entry.amountMinor += payment.amountMinor;
    if (payment.status === "AUTHORIZED") {
      entry.success += 1;
    }
    entry.currency = payment.currency;

     const providerEntry = entry.providers.get(payment.provider) ?? { total: 0, authorized: 0 };
     providerEntry.total += 1;
     if (payment.status === "AUTHORIZED") {
       providerEntry.authorized += 1;
     }
     entry.providers.set(payment.provider, providerEntry);

    grouped.set(key, entry);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([timestamp, stats]) => ({
      timestamp,
      count: stats.count,
      amountMinor: stats.amountMinor,
      successRate: stats.count ? (stats.success / stats.count) * 100 : 0,
      currency: stats.currency,
      providers: Object.fromEntries(
        Array.from(stats.providers.entries()).map(([provider, providerStats]) => [
          provider,
          {
            total: providerStats.total,
            authorized: providerStats.authorized,
            successRate:
              providerStats.total > 0
                ? (providerStats.authorized / providerStats.total) * 100
                : 0,
          },
        ]),
      ),
    }));
};

const aggregateServices = (): ApiMetric[] => {
  const now = new Date().toISOString();
  return [
    {
      service: "executive-api",
      status: "operational",
      latencyP95: 480,
      errorRate: 0.02,
      throughput: 120,
      updatedAt: now,
    },
    {
      service: "payments-api",
      status: "operational",
      latencyP95: 320,
      errorRate: 0.01,
      throughput: 180,
      updatedAt: now,
    },
    {
      service: "conciliador",
      status: "degraded",
      latencyP95: 1100,
      errorRate: 0.07,
      throughput: 45,
      updatedAt: now,
    },
    {
      service: "webhooks",
      status: "operational",
      latencyP95: 220,
      errorRate: 0.005,
      throughput: 260,
      updatedAt: now,
    },
    {
      service: "psp-webpay",
      status: "operational",
      latencyP95: 640,
      errorRate: 0.03,
      throughput: 95,
      updatedAt: now,
    },
    {
      service: "psp-stripe",
      status: "operational",
      latencyP95: 410,
      errorRate: 0.015,
      throughput: 130,
      updatedAt: now,
    },
    {
      service: "psp-paypal",
      status: "degraded",
      latencyP95: 720,
      errorRate: 0.05,
      throughput: 80,
      updatedAt: now,
    },
  ];
};

export const timeseries = aggregateByTimestamp();
export const serviceMetrics = aggregateServices();

export const statusChecks = payments.slice(0, 20).map((payment, index) => {
  const createdAt = new Date(Date.now() - index * 15 * 60 * 1000).toISOString();
  const success = index % 3 !== 0;
  return {
    id: index + 1,
    paymentId: payment.id,
    paymentOrderId: payment.paymentOrderId,
    provider: payment.provider,
    requestedAt: createdAt,
    success,
    providerStatus: success ? "AUTHORIZED" : "INITIALIZED",
    mappedStatus: success ? "AUTHORIZED" : "PENDING",
    responseCode: success ? 200 : 500,
    errorMessage: success ? null : "Simulated provider error",
    rawPayload: {
      amount: payment.amountMinor,
      status: success ? "AUTHORIZED" : "INITIALIZED",
      buy_order: payment.buyOrder,
      provider: payment.provider,
    },
    createdAt,
  };
});

export const crmPushQueue = payments.slice(0, 15).map((payment, index) => {
  const createdAt = new Date(Date.now() - index * 30 * 60 * 1000).toISOString();
  const status = index % 4 === 0 ? "FAILED" : index % 3 === 0 ? "SENDING" : "PENDING";
  return {
    id: index + 1,
    paymentId: payment.id,
    paymentOrderId: payment.paymentOrderId,
    provider: payment.provider,
    operation: "PAYMENT_APPROVED",
    status,
    attempts: index % 5,
    nextAttemptAt: status === "FAILED" ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
    lastAttemptAt: createdAt,
    responseCode: status === "FAILED" ? 500 : null,
    crmId: status === "PENDING" ? `CRM-${index + 100}` : null,
    lastError: status === "FAILED" ? "CRM unavailable" : null,
    payload: {
      paymentId: payment.id,
      amount: payment.amountMinor,
      provider: payment.provider,
    },
    createdAt,
    updatedAt: createdAt,
  };
});

export const crmEventLogs = payments.slice(0, 10).map((payment, index) => {
  const createdAt = new Date(Date.now() - index * 45 * 60 * 1000).toISOString();
  const responseStatus = index % 3 === 0 ? 500 : 200;
  return {
    id: index + 1,
    paymentId: payment.id,
    paymentOrderId: payment.paymentOrderId,
    provider: payment.provider,
    operation: "PAYMENT_APPROVED",
    requestUrl: "https://crm.local/payments",
    requestHeaders: {
      "Content-Type": "application/json",
    },
    requestBody: {
      paymentId: payment.id,
      status: payment.status,
    },
    responseStatus,
    responseHeaders:
      responseStatus === 200
        ? {
            "content-type": "application/json",
          }
        : null,
    responseBody:
      responseStatus === 200
        ? {
            result: "ok",
            crmId: `CRM-${index + 1}`,
          }
        : null,
    errorMessage: responseStatus === 200 ? null : "CRM service unavailable",
    latencyMs: 120 + index * 10,
    createdAt,
  };
});

const computeSummary = (): MetricsPayload => {
  const totalPayments = payments.length;
  const totalAmountMinor = payments.reduce((acc, current) => acc + current.amountMinor, 0);
  const activeCompanies = Math.max(1, new Set(payments.map((payment) => payment.providerAccountId ?? payment.provider)).size);
  const successful = payments.filter((payment) => payment.status === "AUTHORIZED").length;
  const totalsByCurrency = Array.from(
    payments.reduce((acc, payment) => {
      const amount = acc.get(payment.currency) ?? 0;
      acc.set(payment.currency, amount + payment.amountMinor);
      return acc;
    }, new Map<string, number>()).entries(),
  ).map(([currency, amountMinor]) => ({ currency, amountMinor }));

  const pspDistribution = providers.map((provider) => {
    const providerPayments = payments.filter((payment) => payment.provider === provider);
    return {
      provider,
      totalAmountMinor: providerPayments.reduce((acc, current) => acc + current.amountMinor, 0),
      count: providerPayments.length,
      currency: providerPayments[0]?.currency ?? "CLP",
    };
  });

  const topPspEntry = pspDistribution
    .slice()
    .sort((a, b) => b.totalAmountMinor - a.totalAmountMinor)[0];

  return {
    totalPayments,
    totalAmountMinor,
    totalAmountCurrency: totalsByCurrency.length === 1 ? totalsByCurrency[0].currency : "MIXED",
    activeCompanies,
    successRate: totalPayments ? (successful / totalPayments) * 100 : 0,
    topPsp: topPspEntry?.provider ?? null,
    timeseries,
    pspDistribution,
    totalsByCurrency,
    serviceHealth: serviceMetrics,
    statusCounts: paymentsByStatus,
    providerCounts: payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.provider] = (acc[payment.provider] ?? 0) + 1;
      return acc;
    }, {}),
  } satisfies MetricsPayload;
};

const paymentsByStatus = payments.reduce<Record<string, number>>((acc, payment) => {
  acc[payment.status] = (acc[payment.status] ?? 0) + 1;
  return acc;
}, {});

export const metricsSummary = computeSummary();

const now = new Date();

const pendingByProvider = payments
  .filter((payment) => payment.status === "PENDING")
  .reduce<Record<string, number>>((acc, payment) => {
    acc[payment.provider] = (acc[payment.provider] ?? 0) + 1;
    return acc;
  }, {});

const last24h = payments.filter((payment) => {
  const createdAt = new Date(payment.createdAt).getTime();
  return createdAt >= now.getTime() - 24 * 60 * 60 * 1000;
});

export const executiveHealth = {
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime_seconds: 86400,
  service: {
    default_provider: "webpay",
    environment: "local",
    version: "1.3.0",
    host: "exec-local",
    pid: 1234,
  },
  database: {
    connected: true,
    schema: "payments",
  },
  payments: {
    total_payments: payments.length,
    authorized_payments: paymentsByStatus.AUTHORIZED ?? 0,
    total_amount_minor: metricsSummary.totalAmountMinor,
    total_amount_currency: metricsSummary.totalAmountCurrency,
    last_payment_at: payments[0]?.createdAt ?? null,
  },
};

export const paymentsHealth = {
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime_seconds: 43200,
  service: {
    default_provider: "payments-gateway",
    environment: "local",
    version: "2.1.0",
    host: "payments-local",
    pid: 5678,
  },
  database: {
    connected: true,
    schema: "public",
  },
  payments: {
    status_counts: paymentsByStatus,
    pending_by_provider: pendingByProvider,
    last_24h: {
      count: last24h.length,
      amount_minor: last24h.reduce((acc, payment) => acc + payment.amountMinor, 0),
      currency: metricsSummary.totalAmountCurrency,
    },
  },
};

export const conciliatorHealth = {
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime_seconds: 3600,
  service: {
    default_provider: "webpay",
    environment: "local",
    version: "1.0.0",
    host: "conciliator-local",
    pid: 4321,
  },
  database: {
    connected: true,
    schema: "payments",
  },
  payments: {
    total_payments: payments.length,
    authorized_payments: paymentsByStatus.AUTHORIZED ?? 0,
    total_amount_minor: metricsSummary.totalAmountMinor,
    total_amount_currency: metricsSummary.totalAmountCurrency,
    last_payment_at: payments[1]?.createdAt ?? null,
  },
};
