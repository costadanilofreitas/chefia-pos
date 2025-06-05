# Test info

- Name: Loyalty System - Customer Management >> should open points adjustment dialog
- Location: /home/ubuntu/chefia-pos/frontend/apps/pos/e2e/loyalty-system.spec.ts:84:7

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
  - <launching> /home/ubuntu/.cache/ms-playwright/chromium-1169/chrome-linux/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DeferRendererTasksAfterInput,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --enable-automation --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-ljlwB1 --remote-debugging-pipe --no-startup-window
  - <launched> pid=20163
  - [pid=20163][err] [20163:20163:0605/003730.097296:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:249] Missing X server or $DISPLAY
  - [pid=20163][err] [20163:20163:0605/003730.097350:ERROR:ui/aura/env.cc:257] The platform failed to initialize.  Exiting.

```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Loyalty System - Customer Management', () => {
   4 |   test.beforeEach(async ({ page }) => {
   5 |     await page.goto('/pos/1/loyalty');
   6 |     await expect(page.locator('h1')).toContainText('Sistema de Fidelidade');
   7 |   });
   8 |
   9 |   test('should display customer list correctly', async ({ page }) => {
   10 |     // Check if customers are displayed
   11 |     await expect(page.getByText('Maria Silva')).toBeVisible();
   12 |     await expect(page.getByText('João Santos')).toBeVisible();
   13 |     await expect(page.getByText('Ana Costa')).toBeVisible();
   14 |     await expect(page.getByText('Pedro Lima')).toBeVisible();
   15 |     
   16 |     // Check if tier badges are displayed
   17 |     await expect(page.getByText('Ouro')).toBeVisible();
   18 |     await expect(page.getByText('Prata')).toBeVisible();
   19 |     await expect(page.getByText('Platina')).toBeVisible();
   20 |     await expect(page.getByText('Bronze')).toBeVisible();
   21 |   });
   22 |
   23 |   test('should open new customer dialog', async ({ page }) => {
   24 |     // Click new customer button
   25 |     await page.getByRole('button', { name: /novo cliente/i }).click();
   26 |     
   27 |     // Check if dialog opened
   28 |     await expect(page.getByText('Novo Cliente')).toBeVisible();
   29 |     await expect(page.getByLabel('Nome Completo')).toBeVisible();
   30 |     await expect(page.getByLabel('Email')).toBeVisible();
   31 |     await expect(page.getByLabel('Telefone')).toBeVisible();
   32 |     
   33 |     // Close dialog
   34 |     await page.getByRole('button', { name: /cancelar/i }).click();
   35 |     await expect(page.getByText('Novo Cliente')).not.toBeVisible();
   36 |   });
   37 |
   38 |   test('should search customers', async ({ page }) => {
   39 |     // Search for Maria
   40 |     await page.getByPlaceholder('Buscar clientes...').fill('Maria');
   41 |     
   42 |     // Should show only Maria Silva
   43 |     await expect(page.getByText('Maria Silva')).toBeVisible();
   44 |     await expect(page.getByText('João Santos')).not.toBeVisible();
   45 |     
   46 |     // Clear search
   47 |     await page.getByPlaceholder('Buscar clientes...').clear();
   48 |     
   49 |     // All customers should be visible again
   50 |     await expect(page.getByText('Maria Silva')).toBeVisible();
   51 |     await expect(page.getByText('João Santos')).toBeVisible();
   52 |   });
   53 |
   54 |   test('should navigate to coupons tab', async ({ page }) => {
   55 |     // Click coupons tab
   56 |     await page.getByRole('button', { name: /cupons/i }).click();
   57 |     
   58 |     // Check if coupons are displayed
   59 |     await expect(page.getByText('Cupons de Desconto')).toBeVisible();
   60 |     await expect(page.getByText('WELCOME10')).toBeVisible();
   61 |     await expect(page.getByText('FIDELIDADE50')).toBeVisible();
   62 |     await expect(page.getByText('PIZZA20')).toBeVisible();
   63 |     
   64 |     // Check if new coupon button is visible
   65 |     await expect(page.getByRole('button', { name: /novo cupom/i })).toBeVisible();
   66 |   });
   67 |
   68 |   test('should navigate to analytics tab', async ({ page }) => {
   69 |     // Click analytics tab
   70 |     await page.getByRole('button', { name: /analytics/i }).click();
   71 |     
   72 |     // Check if analytics are displayed
   73 |     await expect(page.getByText('Analytics de Fidelidade')).toBeVisible();
   74 |     await expect(page.getByText('Total de Clientes')).toBeVisible();
   75 |     await expect(page.getByText('Pontos Ativos')).toBeVisible();
   76 |     await expect(page.getByText('Faturamento Total')).toBeVisible();
   77 |     await expect(page.getByText('Ticket Médio')).toBeVisible();
   78 |     
   79 |     // Check if distribution chart is visible
   80 |     await expect(page.getByText('Distribuição por Tier')).toBeVisible();
   81 |     await expect(page.getByText('Transações Recentes')).toBeVisible();
   82 |   });
   83 |
>  84 |   test('should open points adjustment dialog', async ({ page }) => {
      |       ^ Error: browserType.launch: Target page, context or browser has been closed
   85 |     // Click adjust points button for first customer
   86 |     await page.getByRole('button', { name: /ajustar pontos/i }).first().click();
   87 |     
   88 |     // Check if dialog opened
   89 |     await expect(page.getByText('Ajustar Pontos - Maria Silva')).toBeVisible();
   90 |     await expect(page.getByText('Pontos atuais:')).toBeVisible();
   91 |     await expect(page.getByLabel('Tipo')).toBeVisible();
   92 |     await expect(page.getByLabel('Quantidade de Pontos')).toBeVisible();
   93 |     
   94 |     // Close dialog
   95 |     await page.getByRole('button', { name: /cancelar/i }).click();
   96 |     await expect(page.getByText('Ajustar Pontos')).not.toBeVisible();
   97 |   });
   98 | });
   99 |
  100 |
```