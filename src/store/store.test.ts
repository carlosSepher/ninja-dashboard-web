import { describe, expect, it } from "vitest";

import { useDashboardStore } from "@/store";

describe("useDashboardStore", () => {
  it("resets filters to defaults", () => {
    const initialFilters = useDashboardStore.getState().filters;
    useDashboardStore
      .getState()
      .setFilters({ buyOrder: "BO-1234", provider: "webpay", environment: "live", paymentId: "pay-001" });
    const mutated = useDashboardStore.getState().filters;
    expect(mutated.buyOrder).toBe("BO-1234");
    expect(mutated.provider).toBe("webpay");
    expect(mutated.environment).toBe("live");
    expect(mutated.paymentId).toBe("pay-001");
    useDashboardStore.getState().resetFilters();
    const resetFilters = useDashboardStore.getState().filters;
    expect(resetFilters.buyOrder).toBe("");
    expect(resetFilters.provider).toBe("all");
    expect(resetFilters.environment).toBe("all");
    expect(resetFilters.paymentId).toBe("");
    const resetFrom = resetFilters.dateRange.from;
    expect(Date.parse(resetFrom)).not.toBeNaN();
    expect(new Date(resetFrom).getTime()).toBeLessThanOrEqual(Date.now());
    expect(resetFrom).not.toBe(initialFilters.dateRange.from);
  });
});
