import { test, expect } from '@playwright/test';

test.describe('Loyalty System - Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos/1/loyalty');
    await expect(page.locator('h1')).toContainText('Sistema de Fidelidade');
  });

  test('should display customer list correctly', async ({ page }) => {
    // Check if customers are displayed
    await expect(page.getByText('Maria Silva')).toBeVisible();
    await expect(page.getByText('João Santos')).toBeVisible();
    await expect(page.getByText('Ana Costa')).toBeVisible();
    await expect(page.getByText('Pedro Lima')).toBeVisible();
    
    // Check if tier badges are displayed
    await expect(page.getByText('Ouro')).toBeVisible();
    await expect(page.getByText('Prata')).toBeVisible();
    await expect(page.getByText('Platina')).toBeVisible();
    await expect(page.getByText('Bronze')).toBeVisible();
  });

  test('should open new customer dialog', async ({ page }) => {
    // Click new customer button
    await page.getByRole('button', { name: /novo cliente/i }).click();
    
    // Check if dialog opened
    await expect(page.getByText('Novo Cliente')).toBeVisible();
    await expect(page.getByLabel('Nome Completo')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Telefone')).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText('Novo Cliente')).not.toBeVisible();
  });

  test('should search customers', async ({ page }) => {
    // Search for Maria
    await page.getByPlaceholder('Buscar clientes...').fill('Maria');
    
    // Should show only Maria Silva
    await expect(page.getByText('Maria Silva')).toBeVisible();
    await expect(page.getByText('João Santos')).not.toBeVisible();
    
    // Clear search
    await page.getByPlaceholder('Buscar clientes...').clear();
    
    // All customers should be visible again
    await expect(page.getByText('Maria Silva')).toBeVisible();
    await expect(page.getByText('João Santos')).toBeVisible();
  });

  test('should navigate to coupons tab', async ({ page }) => {
    // Click coupons tab
    await page.getByRole('button', { name: /cupons/i }).click();
    
    // Check if coupons are displayed
    await expect(page.getByText('Cupons de Desconto')).toBeVisible();
    await expect(page.getByText('WELCOME10')).toBeVisible();
    await expect(page.getByText('FIDELIDADE50')).toBeVisible();
    await expect(page.getByText('PIZZA20')).toBeVisible();
    
    // Check if new coupon button is visible
    await expect(page.getByRole('button', { name: /novo cupom/i })).toBeVisible();
  });

  test('should navigate to analytics tab', async ({ page }) => {
    // Click analytics tab
    await page.getByRole('button', { name: /analytics/i }).click();
    
    // Check if analytics are displayed
    await expect(page.getByText('Analytics de Fidelidade')).toBeVisible();
    await expect(page.getByText('Total de Clientes')).toBeVisible();
    await expect(page.getByText('Pontos Ativos')).toBeVisible();
    await expect(page.getByText('Faturamento Total')).toBeVisible();
    await expect(page.getByText('Ticket Médio')).toBeVisible();
    
    // Check if distribution chart is visible
    await expect(page.getByText('Distribuição por Tier')).toBeVisible();
    await expect(page.getByText('Transações Recentes')).toBeVisible();
  });

  test('should open points adjustment dialog', async ({ page }) => {
    // Click adjust points button for first customer
    await page.getByRole('button', { name: /ajustar pontos/i }).first().click();
    
    // Check if dialog opened
    await expect(page.getByText('Ajustar Pontos - Maria Silva')).toBeVisible();
    await expect(page.getByText('Pontos atuais:')).toBeVisible();
    await expect(page.getByLabel('Tipo')).toBeVisible();
    await expect(page.getByLabel('Quantidade de Pontos')).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText('Ajustar Pontos')).not.toBeVisible();
  });
});

