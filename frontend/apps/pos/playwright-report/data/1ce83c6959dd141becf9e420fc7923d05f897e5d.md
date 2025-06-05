# Test info

- Name: Fiscal Module - Document Management >> should export report functionality
- Location: /home/ubuntu/chefia-pos/frontend/apps/pos/e2e/fiscal-module.spec.ts:103:7

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
  - <launching> /home/ubuntu/.cache/ms-playwright/chromium-1169/chrome-linux/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DeferRendererTasksAfterInput,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --enable-automation --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-QoXu8Z --remote-debugging-pipe --no-startup-window
  - <launched> pid=19968
  - [pid=19968][err] [19968:19968:0605/003727.146741:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:249] Missing X server or $DISPLAY
  - [pid=19968][err] [19968:19968:0605/003727.146796:ERROR:ui/aura/env.cc:257] The platform failed to initialize.  Exiting.

```

# Test source

```ts
   3 | test.describe('Fiscal Module - Document Management', () => {
   4 |   test.beforeEach(async ({ page }) => {
   5 |     await page.goto('/pos/1/fiscal');
   6 |     await expect(page.locator('h1')).toContainText('Módulo Fiscal');
   7 |   });
   8 |
   9 |   test('should display fiscal configuration correctly', async ({ page }) => {
   10 |     // Check if company data is displayed
   11 |     await expect(page.getByText('12.345.678/0001-90')).toBeVisible();
   12 |     await expect(page.getByText('Restaurante ChefIA Ltda')).toBeVisible();
   13 |     await expect(page.getByText('ChefIA Restaurant')).toBeVisible();
   14 |     
   15 |     // Check if modules status are displayed
   16 |     await expect(page.getByText('NFC-e (Nota Fiscal do Consumidor Eletrônica)')).toBeVisible();
   17 |     await expect(page.getByText('SAT (Sistema Autenticador e Transmissor)')).toBeVisible();
   18 |     
   19 |     // Check if certificate info is displayed
   20 |     await expect(page.getByText('certificado.p12')).toBeVisible();
   21 |     await expect(page.getByText('Integração Contabilizei')).toBeVisible();
   22 |   });
   23 |
   24 |   test('should navigate to documents tab', async ({ page }) => {
   25 |     // Click documents tab
   26 |     await page.getByRole('button', { name: /documentos/i }).click();
   27 |     
   28 |     // Check if documents table is displayed
   29 |     await expect(page.getByText('Documentos Fiscais')).toBeVisible();
   30 |     await expect(page.getByText('Tipo')).toBeVisible();
   31 |     await expect(page.getByText('Número')).toBeVisible();
   32 |     await expect(page.getByText('Chave de Acesso')).toBeVisible();
   33 |     
   34 |     // Check if documents are listed
   35 |     await expect(page.getByText('NFC-e')).toBeVisible();
   36 |     await expect(page.getByText('SAT')).toBeVisible();
   37 |     await expect(page.getByText('000001')).toBeVisible();
   38 |     await expect(page.getByText('000002')).toBeVisible();
   39 |     
   40 |     // Check if status chips are displayed
   41 |     await expect(page.getByText('Autorizada')).toBeVisible();
   42 |     await expect(page.getByText('Cancelada')).toBeVisible();
   43 |   });
   44 |
   45 |   test('should navigate to status tab', async ({ page }) => {
   46 |     // Click status tab
   47 |     await page.getByRole('button', { name: /status/i }).click();
   48 |     
   49 |     // Check if status dashboard is displayed
   50 |     await expect(page.getByText('Status do Sistema Fiscal')).toBeVisible();
   51 |     await expect(page.getByText('Total de Documentos')).toBeVisible();
   52 |     await expect(page.getByText('Autorizados')).toBeVisible();
   53 |     await expect(page.getByText('Cancelados')).toBeVisible();
   54 |     await expect(page.getByText('Rejeitados')).toBeVisible();
   55 |     
   56 |     // Check if fiscal revenue is displayed
   57 |     await expect(page.getByText('Faturamento Fiscal')).toBeVisible();
   58 |     await expect(page.getByText('R$ 260.70')).toBeVisible();
   59 |     
   60 |     // Check if service status is displayed
   61 |     await expect(page.getByText('Status dos Serviços')).toBeVisible();
   62 |     await expect(page.getByText('Receita Federal (NFC-e)')).toBeVisible();
   63 |     await expect(page.getByText('SEFAZ SP')).toBeVisible();
   64 |     await expect(page.getByText('Online')).toBeVisible();
   65 |   });
   66 |
   67 |   test('should open configuration dialog', async ({ page }) => {
   68 |     // Click edit configuration button
   69 |     await page.getByRole('button', { name: /editar configuração/i }).click();
   70 |     
   71 |     // Check if dialog opened
   72 |     await expect(page.getByText('Configuração Fiscal')).toBeVisible();
   73 |     await expect(page.getByText('Módulos Fiscais')).toBeVisible();
   74 |     await expect(page.getByText('NFC-e (Nota Fiscal do Consumidor Eletrônica)')).toBeVisible();
   75 |     await expect(page.getByText('Ambiente')).toBeVisible();
   76 |     await expect(page.getByText('Integrações')).toBeVisible();
   77 |     
   78 |     // Close dialog
   79 |     await page.getByRole('button', { name: /cancelar/i }).click();
   80 |     await expect(page.getByText('Configuração Fiscal')).not.toBeVisible();
   81 |   });
   82 |
   83 |   test('should test connection functionality', async ({ page }) => {
   84 |     // Click test connection button
   85 |     await page.getByRole('button', { name: /testar conexão/i }).click();
   86 |     
   87 |     // Button should show testing state
   88 |     await expect(page.getByRole('button', { name: /testando/i })).toBeVisible();
   89 |     
   90 |     // Wait for test to complete (mocked)
   91 |     await page.waitForTimeout(2500);
   92 |     
   93 |     // Button should return to normal state
   94 |     await expect(page.getByRole('button', { name: /testar conexão/i })).toBeVisible();
   95 |   });
   96 |
   97 |   test('should display environment warning', async ({ page }) => {
   98 |     // Check if homologation warning is displayed
   99 |     await expect(page.getByText('Ambiente de Homologação')).toBeVisible();
  100 |     await expect(page.getByText('Os documentos emitidos não têm validade fiscal')).toBeVisible();
  101 |   });
  102 |
> 103 |   test('should export report functionality', async ({ page }) => {
      |       ^ Error: browserType.launch: Target page, context or browser has been closed
  104 |     // Navigate to documents tab
  105 |     await page.getByRole('button', { name: /documentos/i }).click();
  106 |     
  107 |     // Click export report button
  108 |     await page.getByRole('button', { name: /exportar relatório/i }).click();
  109 |     
  110 |     // Should show development message (mocked functionality)
  111 |     page.on('dialog', async dialog => {
  112 |       expect(dialog.message()).toContain('desenvolvimento');
  113 |       await dialog.accept();
  114 |     });
  115 |   });
  116 | });
  117 |
  118 |
```