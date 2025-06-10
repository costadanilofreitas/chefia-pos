import { test, expect } from '@playwright/test';

test.describe('POS System - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the POS system
    await page.goto('/pos/1');
    
    // Wait for the page to load
    await expect(page).toHaveTitle(/POS Modern/);
  });

  test('should load POS main page successfully', async ({ page }) => {
    // Check if main elements are visible
    await expect(page.locator('h1')).toContainText('Terminal 1');
    
    // Check if navigation buttons are present
    await expect(page.getByRole('button', { name: /caixa/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pedidos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
  });

  test('should navigate to order page', async ({ page }) => {
    // Click on orders button
    await page.getByRole('button', { name: /pedidos/i }).click();
    
    // Should navigate to order page
    await expect(page).toHaveURL(/\/pos\/1\/order/);
    
    // Check if order page elements are visible
    await expect(page.locator('h1')).toContainText('Novo Pedido');
  });

  test('should navigate to manager screen with proper permissions', async ({ page }) => {
    // Navigate to manager screen
    await page.goto('/pos/1/manager');
    
    // Should load manager screen
    await expect(page.locator('h1')).toContainText('Sistema de Gestão');
    
    // Check if dashboard elements are visible
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Relatórios')).toBeVisible();
    await expect(page.getByText('Funcionários')).toBeVisible();
  });

  test('should navigate to table layout screen', async ({ page }) => {
    // Navigate to tables
    await page.goto('/pos/1/tables');
    
    // Should load table layout
    await expect(page.locator('h1')).toContainText('Layout do Salão');
    
    // Check if table elements are visible
    await expect(page.getByText('Salão Principal')).toBeVisible();
    await expect(page.getByText('Área VIP')).toBeVisible();
    
    // Check if statistics are displayed
    await expect(page.getByText('Mesas Livres')).toBeVisible();
    await expect(page.getByText('Mesas Ocupadas')).toBeVisible();
  });

  test('should navigate to delivery screen', async ({ page }) => {
    // Navigate to delivery
    await page.goto('/pos/1/delivery');
    
    // Should load delivery screen
    await expect(page.locator('h1')).toContainText('Sistema de Delivery');
    
    // Check if delivery tabs are visible
    await expect(page.getByText('Pedidos')).toBeVisible();
    await expect(page.getByText('Motoboys')).toBeVisible();
  });

  test('should navigate to loyalty screen', async ({ page }) => {
    // Navigate to loyalty
    await page.goto('/pos/1/loyalty');
    
    // Should load loyalty screen
    await expect(page.locator('h1')).toContainText('Sistema de Fidelidade');
    
    // Check if loyalty tabs are visible
    await expect(page.getByText('Clientes')).toBeVisible();
    await expect(page.getByText('Cupons')).toBeVisible();
    await expect(page.getByText('Analytics')).toBeVisible();
  });

  test('should navigate to fiscal screen', async ({ page }) => {
    // Navigate to fiscal
    await page.goto('/pos/1/fiscal');
    
    // Should load fiscal screen
    await expect(page.locator('h1')).toContainText('Módulo Fiscal');
    
    // Check if fiscal tabs are visible
    await expect(page.getByText('Configurações')).toBeVisible();
    await expect(page.getByText('Documentos')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    
    // Check if environment warning is displayed
    await expect(page.getByText('Ambiente de Homologação')).toBeVisible();
  });
});

