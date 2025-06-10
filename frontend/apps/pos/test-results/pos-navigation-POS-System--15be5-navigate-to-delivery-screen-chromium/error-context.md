# Test info

- Name: POS System - Core Functionality >> should navigate to delivery screen
- Location: /home/ubuntu/chefia-pos/frontend/apps/pos/e2e/pos-navigation.spec.ts:62:7

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
  - <launching> /home/ubuntu/.cache/ms-playwright/chromium-1169/chrome-linux/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DeferRendererTasksAfterInput,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --enable-automation --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-NHs3KP --remote-debugging-pipe --no-startup-window
  - <launched> pid=20630
  - [pid=20630][err] [20630:20630:0605/003737.015361:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:249] Missing X server or $DISPLAY
  - [pid=20630][err] [20630:20630:0605/003737.015411:ERROR:ui/aura/env.cc:257] The platform failed to initialize.  Exiting.

```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('POS System - Core Functionality', () => {
   4 |   test.beforeEach(async ({ page }) => {
   5 |     // Navigate to the POS system
   6 |     await page.goto('/pos/1');
   7 |     
   8 |     // Wait for the page to load
   9 |     await expect(page).toHaveTitle(/POS Modern/);
   10 |   });
   11 |
   12 |   test('should load POS main page successfully', async ({ page }) => {
   13 |     // Check if main elements are visible
   14 |     await expect(page.locator('h1')).toContainText('Terminal 1');
   15 |     
   16 |     // Check if navigation buttons are present
   17 |     await expect(page.getByRole('button', { name: /caixa/i })).toBeVisible();
   18 |     await expect(page.getByRole('button', { name: /pedidos/i })).toBeVisible();
   19 |     await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
   20 |   });
   21 |
   22 |   test('should navigate to order page', async ({ page }) => {
   23 |     // Click on orders button
   24 |     await page.getByRole('button', { name: /pedidos/i }).click();
   25 |     
   26 |     // Should navigate to order page
   27 |     await expect(page).toHaveURL(/\/pos\/1\/order/);
   28 |     
   29 |     // Check if order page elements are visible
   30 |     await expect(page.locator('h1')).toContainText('Novo Pedido');
   31 |   });
   32 |
   33 |   test('should navigate to manager screen with proper permissions', async ({ page }) => {
   34 |     // Navigate to manager screen
   35 |     await page.goto('/pos/1/manager');
   36 |     
   37 |     // Should load manager screen
   38 |     await expect(page.locator('h1')).toContainText('Sistema de Gestão');
   39 |     
   40 |     // Check if dashboard elements are visible
   41 |     await expect(page.getByText('Dashboard')).toBeVisible();
   42 |     await expect(page.getByText('Relatórios')).toBeVisible();
   43 |     await expect(page.getByText('Funcionários')).toBeVisible();
   44 |   });
   45 |
   46 |   test('should navigate to table layout screen', async ({ page }) => {
   47 |     // Navigate to tables
   48 |     await page.goto('/pos/1/tables');
   49 |     
   50 |     // Should load table layout
   51 |     await expect(page.locator('h1')).toContainText('Layout do Salão');
   52 |     
   53 |     // Check if table elements are visible
   54 |     await expect(page.getByText('Salão Principal')).toBeVisible();
   55 |     await expect(page.getByText('Área VIP')).toBeVisible();
   56 |     
   57 |     // Check if statistics are displayed
   58 |     await expect(page.getByText('Mesas Livres')).toBeVisible();
   59 |     await expect(page.getByText('Mesas Ocupadas')).toBeVisible();
   60 |   });
   61 |
>  62 |   test('should navigate to delivery screen', async ({ page }) => {
      |       ^ Error: browserType.launch: Target page, context or browser has been closed
   63 |     // Navigate to delivery
   64 |     await page.goto('/pos/1/delivery');
   65 |     
   66 |     // Should load delivery screen
   67 |     await expect(page.locator('h1')).toContainText('Sistema de Delivery');
   68 |     
   69 |     // Check if delivery tabs are visible
   70 |     await expect(page.getByText('Pedidos')).toBeVisible();
   71 |     await expect(page.getByText('Motoboys')).toBeVisible();
   72 |   });
   73 |
   74 |   test('should navigate to loyalty screen', async ({ page }) => {
   75 |     // Navigate to loyalty
   76 |     await page.goto('/pos/1/loyalty');
   77 |     
   78 |     // Should load loyalty screen
   79 |     await expect(page.locator('h1')).toContainText('Sistema de Fidelidade');
   80 |     
   81 |     // Check if loyalty tabs are visible
   82 |     await expect(page.getByText('Clientes')).toBeVisible();
   83 |     await expect(page.getByText('Cupons')).toBeVisible();
   84 |     await expect(page.getByText('Analytics')).toBeVisible();
   85 |   });
   86 |
   87 |   test('should navigate to fiscal screen', async ({ page }) => {
   88 |     // Navigate to fiscal
   89 |     await page.goto('/pos/1/fiscal');
   90 |     
   91 |     // Should load fiscal screen
   92 |     await expect(page.locator('h1')).toContainText('Módulo Fiscal');
   93 |     
   94 |     // Check if fiscal tabs are visible
   95 |     await expect(page.getByText('Configurações')).toBeVisible();
   96 |     await expect(page.getByText('Documentos')).toBeVisible();
   97 |     await expect(page.getByText('Status')).toBeVisible();
   98 |     
   99 |     // Check if environment warning is displayed
  100 |     await expect(page.getByText('Ambiente de Homologação')).toBeVisible();
  101 |   });
  102 | });
  103 |
  104 |
```