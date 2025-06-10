# Test info

- Name: Table Layout - Restaurant Management >> should display table statistics
- Location: /home/ubuntu/chefia-pos/frontend/apps/pos/e2e/table-layout.spec.ts:22:7

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

╔════════════════════════════════════════════════════════════════════════════════════════════════╗
║ Looks like you launched a headed browser without having a XServer running.                     ║
║ Set either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright. ║
║                                                                                                ║
║ <3 Playwright Team                                                                             ║
╚════════════════════════════════════════════════════════════════════════════════════════════════╝
Call log:
  - <launching> /home/ubuntu/.cache/ms-playwright/chromium-1169/chrome-linux/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DeferRendererTasksAfterInput,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --enable-automation --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-oIRePC --remote-debugging-pipe --no-startup-window
  - <launched> pid=20762
  - [pid=20762][err] [20762:20762:0605/003738.953357:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:249] Missing X server or $DISPLAY
  - [pid=20762][err] [20762:20762:0605/003738.953409:ERROR:ui/aura/env.cc:257] The platform failed to initialize.  Exiting.

```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Table Layout - Restaurant Management', () => {
   4 |   test.beforeEach(async ({ page }) => {
   5 |     await page.goto('/pos/1/tables');
   6 |     await expect(page.locator('h1')).toContainText('Layout do Salão');
   7 |   });
   8 |
   9 |   test('should display restaurant layout correctly', async ({ page }) => {
   10 |     // Check if area labels are displayed
   11 |     await expect(page.getByText('Salão Principal')).toBeVisible();
   12 |     await expect(page.getByText('Área VIP')).toBeVisible();
   13 |     await expect(page.getByText('Terraço')).toBeVisible();
   14 |     await expect(page.getByText('Bar')).toBeVisible();
   15 |     
   16 |     // Check if fixed elements are displayed
   17 |     await expect(page.getByText('Entrada')).toBeVisible();
   18 |     await expect(page.getByText('Cozinha')).toBeVisible();
   19 |     await expect(page.getByText('WC')).toBeVisible();
   20 |   });
   21 |
>  22 |   test('should display table statistics', async ({ page }) => {
      |       ^ Error: browserType.launch: Target page, context or browser has been closed
   23 |     // Check if statistics are displayed
   24 |     await expect(page.getByText('Mesas Livres')).toBeVisible();
   25 |     await expect(page.getByText('Mesas Ocupadas')).toBeVisible();
   26 |     await expect(page.getByText('Reservadas')).toBeVisible();
   27 |     await expect(page.getByText('Faturamento')).toBeVisible();
   28 |     
   29 |     // Check if numbers are displayed
   30 |     await expect(page.getByText('7')).toBeVisible(); // Free tables
   31 |     await expect(page.getByText('5')).toBeVisible(); // Occupied tables
   32 |     await expect(page.getByText('2')).toBeVisible(); // Reserved tables
   33 |     await expect(page.getByText('R$ 827,60')).toBeVisible(); // Revenue
   34 |   });
   35 |
   36 |   test('should display tables with different statuses', async ({ page }) => {
   37 |     // Check if tables are rendered (they should be visible as SVG elements)
   38 |     const tables = page.locator('[data-testid^="table-"]');
   39 |     await expect(tables).toHaveCount(15);
   40 |     
   41 |     // Check if navigation buttons are present
   42 |     await expect(page.getByRole('button', { name: /cozinha/i })).toBeVisible();
   43 |     await expect(page.getByRole('button', { name: /delivery/i })).toBeVisible();
   44 |   });
   45 |
   46 |   test('should navigate to kitchen from tables', async ({ page }) => {
   47 |     // Click kitchen button
   48 |     await page.getByRole('button', { name: /cozinha/i }).click();
   49 |     
   50 |     // Should show alert about KDS being separate system
   51 |     page.on('dialog', async dialog => {
   52 |       expect(dialog.message()).toContain('KDS');
   53 |       await dialog.accept();
   54 |     });
   55 |   });
   56 |
   57 |   test('should navigate to delivery from tables', async ({ page }) => {
   58 |     // Click delivery button
   59 |     await page.getByRole('button', { name: /delivery/i }).click();
   60 |     
   61 |     // Should navigate to delivery screen
   62 |     await expect(page).toHaveURL(/\/pos\/1\/delivery/);
   63 |     await expect(page.locator('h1')).toContainText('Sistema de Delivery');
   64 |   });
   65 |
   66 |   test('should handle table interactions', async ({ page }) => {
   67 |     // Tables should be interactive (hover effects)
   68 |     const firstTable = page.locator('[data-testid="table-1"]');
   69 |     await expect(firstTable).toBeVisible();
   70 |     
   71 |     // Hover over table should show cursor pointer
   72 |     await firstTable.hover();
   73 |     
   74 |     // Tables should have different colors based on status
   75 |     // This would be tested by checking computed styles in a real implementation
   76 |   });
   77 |
   78 |   test('should display table details correctly', async ({ page }) => {
   79 |     // The layout should show tables with proper positioning
   80 |     // Check if tables are positioned in different areas
   81 |     const mainAreaTables = page.locator('[data-area="main"]');
   82 |     const vipAreaTables = page.locator('[data-area="vip"]');
   83 |     const terraceTables = page.locator('[data-area="terrace"]');
   84 |     const barTables = page.locator('[data-area="bar"]');
   85 |     
   86 |     // Each area should have tables (this would need data attributes in real implementation)
   87 |     // For now, we just check that the layout container exists
   88 |     await expect(page.locator('.restaurant-layout')).toBeVisible();
   89 |   });
   90 |
   91 |   test('should be responsive on mobile', async ({ page }) => {
   92 |     // Set mobile viewport
   93 |     await page.setViewportSize({ width: 375, height: 667 });
   94 |     
   95 |     // Layout should still be visible and functional
   96 |     await expect(page.locator('h1')).toContainText('Layout do Salão');
   97 |     await expect(page.getByText('Mesas Livres')).toBeVisible();
   98 |     
   99 |     // Navigation buttons should be accessible
  100 |     await expect(page.getByRole('button', { name: /cozinha/i })).toBeVisible();
  101 |     await expect(page.getByRole('button', { name: /delivery/i })).toBeVisible();
  102 |   });
  103 | });
  104 |
  105 |
```