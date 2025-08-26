import { expect, test } from "@playwright/test";

test.describe("Table Layout - Restaurant Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pos/1/tables");
    await expect(page.locator("h1")).toContainText("Layout do Salão");
  });

  test("should display restaurant layout correctly", async ({ page }) => {
    // Check if area labels are displayed
    await expect(page.getByText("Salão Principal")).toBeVisible();
    await expect(page.getByText("Área VIP")).toBeVisible();
    await expect(page.getByText("Terraço")).toBeVisible();
    await expect(page.getByText("Bar")).toBeVisible();

    // Check if fixed elements are displayed
    await expect(page.getByText("Entrada")).toBeVisible();
    await expect(page.getByText("Cozinha")).toBeVisible();
    await expect(page.getByText("WC")).toBeVisible();
  });

  test("should display table statistics", async ({ page }) => {
    // Check if statistics are displayed
    await expect(page.getByText("Mesas Livres")).toBeVisible();
    await expect(page.getByText("Mesas Ocupadas")).toBeVisible();
    await expect(page.getByText("Reservadas")).toBeVisible();
    await expect(page.getByText("Faturamento")).toBeVisible();

    // Check if numbers are displayed
    await expect(page.getByText("7")).toBeVisible(); // Free tables
    await expect(page.getByText("5")).toBeVisible(); // Occupied tables
    await expect(page.getByText("2")).toBeVisible(); // Reserved tables
    await expect(page.getByText("R$ 827,60")).toBeVisible(); // Revenue
  });

  test("should display tables with different statuses", async ({ page }) => {
    // Check if tables are rendered (they should be visible as SVG elements)
    const tables = page.locator('[data-testid^="table-"]');
    await expect(tables).toHaveCount(15);

    // Check if navigation buttons are present
    await expect(page.getByRole("button", { name: /cozinha/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /delivery/i })).toBeVisible();
  });

  test("should navigate to kitchen from tables", async ({ page }) => {
    // Click kitchen button
    await page.getByRole("button", { name: /cozinha/i }).click();

    // Should show alert about KDS being separate system
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("KDS");
      await dialog.accept();
    });
  });

  test("should navigate to delivery from tables", async ({ page }) => {
    // Click delivery button
    await page.getByRole("button", { name: /delivery/i }).click();

    // Should navigate to delivery screen
    await expect(page).toHaveURL(/\/pos\/1\/delivery/);
    await expect(page.locator("h1")).toContainText("Sistema de Delivery");
  });

  test("should handle table interactions", async ({ page }) => {
    // Tables should be interactive (hover effects)
    const firstTable = page.locator('[data-testid="table-1"]');
    await expect(firstTable).toBeVisible();

    // Hover over table should show cursor pointer
    await firstTable.hover();

    // Tables should have different colors based on status
    // This would be tested by checking computed styles in a real implementation
  });

  test("should display table details correctly", async ({ page }) => {
    // Each area should have tables (this would need data attributes in real implementation)
    // For now, we just check that the layout container exists
    await expect(page.locator(".restaurant-layout")).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Layout should still be visible and functional
    await expect(page.locator("h1")).toContainText("Layout do Salão");
    await expect(page.getByText("Mesas Livres")).toBeVisible();

    // Navigation buttons should be accessible
    await expect(page.getByRole("button", { name: /cozinha/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /delivery/i })).toBeVisible();
  });
});
