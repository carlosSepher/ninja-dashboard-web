import { describe, expect, it } from "vitest";

import { apiClient } from "./apiClient";

describe("apiClient", () => {
  it("fetches metrics via msw", async () => {
    const metrics = await apiClient.getMetrics();
    expect(metrics.totalPayments).toBeGreaterThan(0);
    expect(metrics.pspDistribution[0]?.currency).toBeTruthy();
    expect(metrics.totalsByCurrency.length).toBeGreaterThan(0);
    expect(
      metrics.totalAmountCurrency === null || /^[A-Z]{3}$/.test(metrics.totalAmountCurrency),
    ).toBe(true);
  });

  it("fetches payments via msw", async () => {
    const response = await apiClient.getPayments({
      from: new Date(0).toISOString(),
      to: new Date().toISOString(),
      page: 1,
      pageSize: 10,
    });

    expect(response.items.length).toBeGreaterThan(0);
    expect(response.count).toBeGreaterThan(0);
  });

  it("fetches services health via msw", async () => {
    const snapshots = await apiClient.getServicesHealth();
    expect(snapshots.length).toBeGreaterThan(0);
    expect(typeof snapshots[0].database.connected).toBe("boolean");
  });
});
