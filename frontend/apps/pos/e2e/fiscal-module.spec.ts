import { test, expect } from '@playwright/test';

test.describe('Fiscal Module - Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos/1/fiscal');
    await expect(page.locator('h1')).toContainText('Módulo Fiscal');
  });

  test('should display fiscal configuration correctly', async ({ page }) => {
    // Check if company data is displayed
    await expect(page.getByText('12.345.678/0001-90')).toBeVisible();
    await expect(page.getByText('Restaurante ChefIA Ltda')).toBeVisible();
    await expect(page.getByText('ChefIA Restaurant')).toBeVisible();
    
    // Check if modules status are displayed
    await expect(page.getByText('NFC-e (Nota Fiscal do Consumidor Eletrônica)')).toBeVisible();
    await expect(page.getByText('SAT (Sistema Autenticador e Transmissor)')).toBeVisible();
    
    // Check if certificate info is displayed
    await expect(page.getByText('certificado.p12')).toBeVisible();
    await expect(page.getByText('Integração Contabilizei')).toBeVisible();
  });

  test('should navigate to documents tab', async ({ page }) => {
    // Click documents tab
    await page.getByRole('button', { name: /documentos/i }).click();
    
    // Check if documents table is displayed
    await expect(page.getByText('Documentos Fiscais')).toBeVisible();
    await expect(page.getByText('Tipo')).toBeVisible();
    await expect(page.getByText('Número')).toBeVisible();
    await expect(page.getByText('Chave de Acesso')).toBeVisible();
    
    // Check if documents are listed
    await expect(page.getByText('NFC-e')).toBeVisible();
    await expect(page.getByText('SAT')).toBeVisible();
    await expect(page.getByText('000001')).toBeVisible();
    await expect(page.getByText('000002')).toBeVisible();
    
    // Check if status chips are displayed
    await expect(page.getByText('Autorizada')).toBeVisible();
    await expect(page.getByText('Cancelada')).toBeVisible();
  });

  test('should navigate to status tab', async ({ page }) => {
    // Click status tab
    await page.getByRole('button', { name: /status/i }).click();
    
    // Check if status dashboard is displayed
    await expect(page.getByText('Status do Sistema Fiscal')).toBeVisible();
    await expect(page.getByText('Total de Documentos')).toBeVisible();
    await expect(page.getByText('Autorizados')).toBeVisible();
    await expect(page.getByText('Cancelados')).toBeVisible();
    await expect(page.getByText('Rejeitados')).toBeVisible();
    
    // Check if fiscal revenue is displayed
    await expect(page.getByText('Faturamento Fiscal')).toBeVisible();
    await expect(page.getByText('R$ 260.70')).toBeVisible();
    
    // Check if service status is displayed
    await expect(page.getByText('Status dos Serviços')).toBeVisible();
    await expect(page.getByText('Receita Federal (NFC-e)')).toBeVisible();
    await expect(page.getByText('SEFAZ SP')).toBeVisible();
    await expect(page.getByText('Online')).toBeVisible();
  });

  test('should open configuration dialog', async ({ page }) => {
    // Click edit configuration button
    await page.getByRole('button', { name: /editar configuração/i }).click();
    
    // Check if dialog opened
    await expect(page.getByText('Configuração Fiscal')).toBeVisible();
    await expect(page.getByText('Módulos Fiscais')).toBeVisible();
    await expect(page.getByText('NFC-e (Nota Fiscal do Consumidor Eletrônica)')).toBeVisible();
    await expect(page.getByText('Ambiente')).toBeVisible();
    await expect(page.getByText('Integrações')).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText('Configuração Fiscal')).not.toBeVisible();
  });

  test('should test connection functionality', async ({ page }) => {
    // Click test connection button
    await page.getByRole('button', { name: /testar conexão/i }).click();
    
    // Button should show testing state
    await expect(page.getByRole('button', { name: /testando/i })).toBeVisible();
    
    // Wait for test to complete (mocked)
    await page.waitForTimeout(2500);
    
    // Button should return to normal state
    await expect(page.getByRole('button', { name: /testar conexão/i })).toBeVisible();
  });

  test('should display environment warning', async ({ page }) => {
    // Check if homologation warning is displayed
    await expect(page.getByText('Ambiente de Homologação')).toBeVisible();
    await expect(page.getByText('Os documentos emitidos não têm validade fiscal')).toBeVisible();
  });

  test('should export report functionality', async ({ page }) => {
    // Navigate to documents tab
    await page.getByRole('button', { name: /documentos/i }).click();
    
    // Click export report button
    await page.getByRole('button', { name: /exportar relatório/i }).click();
    
    // Should show development message (mocked functionality)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('desenvolvimento');
      await dialog.accept();
    });
  });
});

