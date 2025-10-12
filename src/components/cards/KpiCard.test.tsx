import { render, screen } from "@testing-library/react";

import { KpiCard, currencyFormatter } from "./KpiCard";

describe("KpiCard", () => {
  it("renders formatted value", () => {
    render(<KpiCard title="Total" value={1250000} formatter={currencyFormatter} />);
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("$1.250.000"))).toBeInTheDocument();
  });
});
