import { expect, test } from "@playwright/test";

test("loads overview dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Total payments")).toBeVisible();
  await expect(page.getByText("Top PSP")).toBeVisible();
});
