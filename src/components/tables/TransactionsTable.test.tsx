import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { TransactionsTable } from "./TransactionsTable";
import type { Payment } from "@/store/types/dashboard";

const sample: Payment[] = Array.from({ length: 5 }).map((_, index) => ({
  id: `pay-${index}`,
  paymentOrderId: `ord-${index}`,
  buyOrder: `BO-${index.toString().padStart(4, "0")}`,
  provider: "webpay",
  status: "AUTHORIZED",
  environment: index % 2 === 0 ? "test" : "live",
  amountMinor: 1000 * (index + 1),
  currency: "CLP",
  providerAccountId: index % 2 === 0 ? `acct-${index}` : null,
  companyId: "cmp-1",
  token: `tok-${index}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusReason: null,
  authorizationCode: `AUTH-${index}`,
  responseCode: "00",
}));

describe("TransactionsTable", () => {
  it("renders rows and supports pagination controls", () => {
    render(
      <TransactionsTable
        data={sample}
        loading={false}
        total={50}
        page={2}
        pageSize={25}
        onPageChange={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(screen.getByText(/Showing/)).toHaveTextContent("26-50");
    expect(screen.getAllByText(/BO-/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^tok-/i).length).toBeGreaterThan(0);
  });

  it("shows loading skeleton", () => {
    render(
      <TransactionsTable
        data={[]}
        loading
        total={0}
        page={1}
        pageSize={25}
        onPageChange={vi.fn()}
        onReload={vi.fn()}
      />,
    );
    expect(screen.getByText(/Transactions/)).toBeInTheDocument();
  });
});
