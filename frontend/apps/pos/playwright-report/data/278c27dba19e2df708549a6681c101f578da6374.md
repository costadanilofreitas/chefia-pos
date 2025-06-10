# Test info

- Name: Manager Dashboard - Administrative Functions >> should handle permission-based access
- Location: /home/ubuntu/chefia-pos/frontend/apps/pos/e2e/manager-dashboard.spec.ts:131:7

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
  - <launching> /home/ubuntu/.cache/ms-playwright/chromium-1169/chrome-linux/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DeferRendererTasksAfterInput,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --enable-automation --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-nYzxT6 --remote-debugging-pipe --no-startup-window
  - <launched> pid=20437
  - [pid=20437][err] [20437:20437:0605/003734.127129:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:249] Missing X server or $DISPLAY
  - [pid=20437][err] [20437:20437:0605/003734.127189:ERROR:ui/aura/env.cc:257] The platform failed to initialize.  Exiting.

```

# Test source

```ts
   31 |     await page.getByRole('button', { name: /relatórios/i }).click();
   32 |     await expect(page.getByText('Relatórios Gerenciais')).toBeVisible();
   33 |     
   34 |     // Navigate to employees tab
   35 |     await page.getByRole('button', { name: /funcionários/i }).click();
   36 |     await expect(page.getByText('Gestão de Funcionários')).toBeVisible();
   37 |     
   38 |     // Navigate to settings tab
   39 |     await page.getByRole('button', { name: /configurações/i }).click();
   40 |     await expect(page.getByText('Configurações do Sistema')).toBeVisible();
   41 |     
   42 |     // Return to dashboard
   43 |     await page.getByRole('button', { name: /dashboard/i }).click();
   44 |     await expect(page.getByText('Vendas Hoje')).toBeVisible();
   45 |   });
   46 |
   47 |   test('should display reports section', async ({ page }) => {
   48 |     // Navigate to reports tab
   49 |     await page.getByRole('button', { name: /relatórios/i }).click();
   50 |     
   51 |     // Check if report options are displayed
   52 |     await expect(page.getByText('Relatórios Gerenciais')).toBeVisible();
   53 |     await expect(page.getByText('Relatório de Vendas')).toBeVisible();
   54 |     await expect(page.getByText('Relatório de Caixa')).toBeVisible();
   55 |     
   56 |     // Check if generate buttons are present
   57 |     await expect(page.getByRole('button', { name: /gerar relatório/i })).toHaveCount(2);
   58 |   });
   59 |
   60 |   test('should display employees management', async ({ page }) => {
   61 |     // Navigate to employees tab
   62 |     await page.getByRole('button', { name: /funcionários/i }).click();
   63 |     
   64 |     // Check if employees table is displayed
   65 |     await expect(page.getByText('Gestão de Funcionários')).toBeVisible();
   66 |     await expect(page.getByText('Nome')).toBeVisible();
   67 |     await expect(page.getByText('Cargo')).toBeVisible();
   68 |     await expect(page.getByText('Status')).toBeVisible();
   69 |     
   70 |     // Check if mock employees are listed
   71 |     await expect(page.getByText('João Silva')).toBeVisible();
   72 |     await expect(page.getByText('Maria Santos')).toBeVisible();
   73 |     await expect(page.getByText('Pedro Costa')).toBeVisible();
   74 |     
   75 |     // Check if roles are displayed
   76 |     await expect(page.getByText('Gerente')).toBeVisible();
   77 |     await expect(page.getByText('Caixa')).toBeVisible();
   78 |     await expect(page.getByText('Garçom')).toBeVisible();
   79 |   });
   80 |
   81 |   test('should display system settings', async ({ page }) => {
   82 |     // Navigate to settings tab
   83 |     await page.getByRole('button', { name: /configurações/i }).click();
   84 |     
   85 |     // Check if settings sections are displayed
   86 |     await expect(page.getByText('Configurações do Sistema')).toBeVisible();
   87 |     await expect(page.getByText('Configurações Gerais')).toBeVisible();
   88 |     await expect(page.getByText('Backup e Restauração')).toBeVisible();
   89 |     
   90 |     // Check if setting options are present
   91 |     await expect(page.getByText('Nome do Estabelecimento')).toBeVisible();
   92 |     await expect(page.getByText('Fuso Horário')).toBeVisible();
   93 |     await expect(page.getByText('Moeda Padrão')).toBeVisible();
   94 |   });
   95 |
   96 |   test('should handle dashboard refresh', async ({ page }) => {
   97 |     // Check if refresh functionality works
   98 |     await page.reload();
   99 |     
  100 |     // Dashboard should load correctly after refresh
  101 |     await expect(page.locator('h1')).toContainText('Sistema de Gestão');
  102 |     await expect(page.getByText('Vendas Hoje')).toBeVisible();
  103 |     await expect(page.getByText('R$ 2.450,80')).toBeVisible();
  104 |   });
  105 |
  106 |   test('should navigate back to POS', async ({ page }) => {
  107 |     // Click back to POS button
  108 |     await page.getByRole('button', { name: /voltar ao pos/i }).click();
  109 |     
  110 |     // Should navigate back to main POS screen
  111 |     await expect(page).toHaveURL(/\/pos\/1$/);
  112 |     await expect(page.locator('h1')).toContainText('Terminal 1');
  113 |   });
  114 |
  115 |   test('should be accessible on mobile', async ({ page }) => {
  116 |     // Set mobile viewport
  117 |     await page.setViewportSize({ width: 375, height: 667 });
  118 |     
  119 |     // Manager screen should be responsive
  120 |     await expect(page.locator('h1')).toContainText('Sistema de Gestão');
  121 |     
  122 |     // Tabs should be accessible
  123 |     await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
  124 |     await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
  125 |     
  126 |     // KPIs should be visible (might stack vertically)
  127 |     await expect(page.getByText('Vendas Hoje')).toBeVisible();
  128 |     await expect(page.getByText('Pedidos Hoje')).toBeVisible();
  129 |   });
  130 |
> 131 |   test('should handle permission-based access', async ({ page }) => {
      |       ^ Error: browserType.launch: Target page, context or browser has been closed
  132 |     // Manager screen should be accessible (user has manager role in mock)
  133 |     await expect(page.locator('h1')).toContainText('Sistema de Gestão');
  134 |     
  135 |     // All manager functions should be available
  136 |     await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
  137 |     await expect(page.getByRole('button', { name: /funcionários/i })).toBeVisible();
  138 |     await expect(page.getByRole('button', { name: /configurações/i })).toBeVisible();
  139 |   });
  140 | });
  141 |
  142 |
```