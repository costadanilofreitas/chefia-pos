import { test, expect } from '@playwright/test';

test.describe('Manager Dashboard - Administrative Functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos/1/manager');
    await expect(page.locator('h1')).toContainText('Sistema de Gestão');
  });

  test('should display dashboard KPIs correctly', async ({ page }) => {
    // Check if KPI cards are displayed
    await expect(page.getByText('Vendas Hoje')).toBeVisible();
    await expect(page.getByText('Pedidos Hoje')).toBeVisible();
    await expect(page.getByText('Ticket Médio')).toBeVisible();
    await expect(page.getByText('Caixas Abertos')).toBeVisible();
    
    // Check if KPI values are displayed
    await expect(page.getByText('R$ 2.450,80')).toBeVisible();
    await expect(page.getByText('45')).toBeVisible();
    await expect(page.getByText('R$ 54,46')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
  });

  test('should navigate between dashboard tabs', async ({ page }) => {
    // Check if all tabs are visible
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /funcionários/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /configurações/i })).toBeVisible();
    
    // Navigate to reports tab
    await page.getByRole('button', { name: /relatórios/i }).click();
    await expect(page.getByText('Relatórios Gerenciais')).toBeVisible();
    
    // Navigate to employees tab
    await page.getByRole('button', { name: /funcionários/i }).click();
    await expect(page.getByText('Gestão de Funcionários')).toBeVisible();
    
    // Navigate to settings tab
    await page.getByRole('button', { name: /configurações/i }).click();
    await expect(page.getByText('Configurações do Sistema')).toBeVisible();
    
    // Return to dashboard
    await page.getByRole('button', { name: /dashboard/i }).click();
    await expect(page.getByText('Vendas Hoje')).toBeVisible();
  });

  test('should display reports section', async ({ page }) => {
    // Navigate to reports tab
    await page.getByRole('button', { name: /relatórios/i }).click();
    
    // Check if report options are displayed
    await expect(page.getByText('Relatórios Gerenciais')).toBeVisible();
    await expect(page.getByText('Relatório de Vendas')).toBeVisible();
    await expect(page.getByText('Relatório de Caixa')).toBeVisible();
    
    // Check if generate buttons are present
    await expect(page.getByRole('button', { name: /gerar relatório/i })).toHaveCount(2);
  });

  test('should display employees management', async ({ page }) => {
    // Navigate to employees tab
    await page.getByRole('button', { name: /funcionários/i }).click();
    
    // Check if employees table is displayed
    await expect(page.getByText('Gestão de Funcionários')).toBeVisible();
    await expect(page.getByText('Nome')).toBeVisible();
    await expect(page.getByText('Cargo')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    
    // Check if mock employees are listed
    await expect(page.getByText('João Silva')).toBeVisible();
    await expect(page.getByText('Maria Santos')).toBeVisible();
    await expect(page.getByText('Pedro Costa')).toBeVisible();
    
    // Check if roles are displayed
    await expect(page.getByText('Gerente')).toBeVisible();
    await expect(page.getByText('Caixa')).toBeVisible();
    await expect(page.getByText('Garçom')).toBeVisible();
  });

  test('should display system settings', async ({ page }) => {
    // Navigate to settings tab
    await page.getByRole('button', { name: /configurações/i }).click();
    
    // Check if settings sections are displayed
    await expect(page.getByText('Configurações do Sistema')).toBeVisible();
    await expect(page.getByText('Configurações Gerais')).toBeVisible();
    await expect(page.getByText('Backup e Restauração')).toBeVisible();
    
    // Check if setting options are present
    await expect(page.getByText('Nome do Estabelecimento')).toBeVisible();
    await expect(page.getByText('Fuso Horário')).toBeVisible();
    await expect(page.getByText('Moeda Padrão')).toBeVisible();
  });

  test('should handle dashboard refresh', async ({ page }) => {
    // Check if refresh functionality works
    await page.reload();
    
    // Dashboard should load correctly after refresh
    await expect(page.locator('h1')).toContainText('Sistema de Gestão');
    await expect(page.getByText('Vendas Hoje')).toBeVisible();
    await expect(page.getByText('R$ 2.450,80')).toBeVisible();
  });

  test('should navigate back to POS', async ({ page }) => {
    // Click back to POS button
    await page.getByRole('button', { name: /voltar ao pos/i }).click();
    
    // Should navigate back to main POS screen
    await expect(page).toHaveURL(/\/pos\/1$/);
    await expect(page.locator('h1')).toContainText('Terminal 1');
  });

  test('should be accessible on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Manager screen should be responsive
    await expect(page.locator('h1')).toContainText('Sistema de Gestão');
    
    // Tabs should be accessible
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
    
    // KPIs should be visible (might stack vertically)
    await expect(page.getByText('Vendas Hoje')).toBeVisible();
    await expect(page.getByText('Pedidos Hoje')).toBeVisible();
  });

  test('should handle permission-based access', async ({ page }) => {
    // Manager screen should be accessible (user has manager role in mock)
    await expect(page.locator('h1')).toContainText('Sistema de Gestão');
    
    // All manager functions should be available
    await expect(page.getByRole('button', { name: /relatórios/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /funcionários/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /configurações/i })).toBeVisible();
  });
});

