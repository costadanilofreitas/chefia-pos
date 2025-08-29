import { test, expect, Page } from '@playwright/test';

// Test configuration
test.describe.configure({ mode: 'parallel' });

// Helper functions
async function waitForOrdersToLoad(page: Page) {
  await page.waitForSelector('[data-testid^="order-card-"]', { timeout: 10000 });
}

async function mockAPIResponses(page: Page) {
  // Mock orders API
  await page.route('**/api/v1/kds/orders', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          table_number: 5,
          customer_name: 'John Doe',
          status: 'pending',
          priority: 'normal',
          items: [
            { item_id: 1, name: 'Burger', quantity: 2, status: 'pending', station: 'kitchen' },
            { item_id: 2, name: 'Fries', quantity: 1, status: 'pending', station: 'kitchen' }
          ],
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          table_number: 3,
          customer_name: 'Jane Smith',
          status: 'preparing',
          priority: 'high',
          items: [
            { item_id: 3, name: 'Pizza', quantity: 1, status: 'preparing', station: 'kitchen' },
            { item_id: 4, name: 'Salad', quantity: 1, status: 'ready', station: 'kitchen' }
          ],
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          table_number: 8,
          customer_name: 'Bob Wilson',
          status: 'pending',
          priority: 'urgent',
          items: [
            { item_id: 5, name: 'Steak', quantity: 1, status: 'pending', station: 'grill' }
          ],
          created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        }
      ])
    });
  });

  // Mock stations API
  await page.route('**/api/v1/kds/stations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'kitchen', name: 'Kitchen', type: 'preparation', active: true },
        { id: 'grill', name: 'Grill', type: 'preparation', active: true },
        { id: 'bar', name: 'Bar', type: 'beverage', active: true }
      ])
    });
  });
}

test.describe('KDS - Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIResponses(page);
    await page.goto('/');
    await waitForOrdersToLoad(page);
  });

  test.describe('Order Management Flow', () => {
    test('should complete full order lifecycle', async ({ page }) => {
      // 1. View pending orders
      const pendingOrder = page.locator('[data-testid="order-card-1"]');
      await expect(pendingOrder).toBeVisible();
      await expect(pendingOrder).toContainText('Pedido #1');
      await expect(pendingOrder).toContainText('pending');

      // 2. Start preparing order
      await pendingOrder.locator('button:has-text("Iniciar Preparo")').click();
      
      // Mock status update response
      await page.route('**/api/v1/kds/orders/1/status', async (route) => {
        await route.fulfill({ status: 200 });
      });

      // Verify status changed
      await expect(pendingOrder).toContainText('preparing');

      // 3. Mark individual items as ready
      const burgerItem = pendingOrder.locator('text=Burger').locator('..');
      await burgerItem.locator('button:has-text("Marcar Item")').click();

      await page.route('**/api/v1/kds/orders/1/items/1/status', async (route) => {
        await route.fulfill({ status: 200 });
      });

      // 4. Complete the order
      await pendingOrder.locator('button:has-text("Marcar como Pronto")').click();
      await expect(pendingOrder).toContainText('ready');

      // 5. Verify success notification
      await expect(page.locator('[data-testid="alert-system"]')).toContainText('Pedido #1 pronto');
    });

    test('should handle urgent orders with priority', async ({ page }) => {
      // Urgent order should be highlighted
      const urgentOrder = page.locator('[data-testid="order-card-3"]');
      await expect(urgentOrder).toHaveClass(/urgent|danger/);
      
      // Should show urgent badge
      await expect(urgentOrder).toContainText('URGENT');
      
      // Should trigger alert
      await expect(page.locator('[data-testid="alert-system"]')).toContainText('urgente');
      
      // Sound should play (check if sound button indicates it's on)
      const soundButton = page.locator('button[aria-label*="som"]');
      await expect(soundButton).toContainText(/Volume/);
    });

    test('should filter orders by station', async ({ page }) => {
      // Select kitchen station
      const stationSelector = page.locator('select');
      await stationSelector.selectOption('kitchen');

      // Mock filtered response
      await page.route('**/api/v1/kds/stations/kitchen/orders', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              table_number: 5,
              status: 'pending',
              items: [
                { item_id: 1, name: 'Burger', station: 'kitchen' }
              ],
              created_at: new Date().toISOString()
            }
          ])
        });
      });

      // Should only show kitchen orders
      await expect(page.locator('[data-testid="order-card-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="order-card-3"]')).not.toBeVisible();

      // Statistics should update
      await expect(page.locator('text=Total: 1')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should receive and display new orders via WebSocket', async ({ page }) => {
      // Setup WebSocket mock
      await page.evaluate(() => {
        window.WebSocket = class MockWebSocket {
          constructor(public url: string) {
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
              
              // Simulate new order after 2 seconds
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage(new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'order.created',
                      data: {
                        id: 4,
                        table_number: 10,
                        status: 'pending',
                        priority: 'normal',
                        items: [{ item_id: 6, name: 'Pasta', station: 'kitchen' }]
                      }
                    })
                  }));
                }
              }, 2000);
            }, 100);
          }
          
          send() {}
          close() {}
          onopen: ((event: Event) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
        } as any;
      });

      // Wait for WebSocket connection
      await page.waitForTimeout(500);
      await expect(page.locator('text=Online')).toBeVisible();

      // Wait for new order to appear
      await page.waitForTimeout(2500);
      
      // Update mock to include new order
      await page.route('**/api/v1/kds/orders', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 4, table_number: 10, status: 'pending', items: [] }
          ])
        });
      });

      await expect(page.locator('[data-testid="order-card-4"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-system"]')).toContainText('Novo pedido #4');
    });

    test('should handle connection loss and recovery', async ({ page }) => {
      // Initially online
      await expect(page.locator('text=Online')).toBeVisible();

      // Simulate offline
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await expect(page.locator('text=Offline')).toBeVisible();
      await expect(page.locator('text=Sistema offline')).toBeVisible();

      // Actions should still work offline (using cache)
      const order = page.locator('[data-testid="order-card-1"]');
      await order.locator('button:has-text("Iniciar Preparo")').click();

      // Simulate back online
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      await expect(page.locator('text=Online')).toBeVisible();
    });
  });

  test.describe('User Interface Features', () => {
    test('should toggle dark mode', async ({ page }) => {
      // Find theme toggle button
      const themeButton = page.locator('button[aria-label*="modo"]');
      
      // Get initial state
      const htmlElement = page.locator('html');
      const initialHasDark = await htmlElement.evaluate(el => el.classList.contains('dark'));

      // Toggle theme
      await themeButton.click();

      // Check if dark class toggled
      const afterToggleHasDark = await htmlElement.evaluate(el => el.classList.contains('dark'));
      expect(afterToggleHasDark).not.toBe(initialHasDark);

      // Visual elements should adapt
      if (afterToggleHasDark) {
        await expect(page.locator('.dark\\:bg-gray-900')).toBeVisible();
      }
    });

    test('should enter and exit fullscreen mode', async ({ page }) => {
      // Mock fullscreen API
      await page.evaluate(() => {
        document.documentElement.requestFullscreen = () => Promise.resolve();
        document.exitFullscreen = () => Promise.resolve();
        Object.defineProperty(document, 'fullscreenElement', {
          writable: true,
          value: null
        });
      });

      const fullscreenButton = page.locator('button[aria-label*="tela cheia"]');
      
      // Enter fullscreen
      await fullscreenButton.click();
      await page.evaluate(() => {
        (document as any).fullscreenElement = document.documentElement;
      });

      // Button should change to exit fullscreen
      await expect(fullscreenButton).toHaveAttribute('aria-label', /Sair da tela cheia/);

      // Exit fullscreen
      await fullscreenButton.click();
      await page.evaluate(() => {
        (document as any).fullscreenElement = null;
      });

      await expect(fullscreenButton).toHaveAttribute('aria-label', /Entrar em tela cheia/);
    });

    test('should show and use keyboard shortcuts', async ({ page }) => {
      // Open help modal
      const helpButton = page.locator('button[aria-label*="atalhos"]');
      await helpButton.click();

      // Help modal should be visible
      const helpModal = page.locator('text=Atalhos do Teclado');
      await expect(helpModal).toBeVisible();
      await expect(page.locator('text=Navegar pedidos')).toBeVisible();
      await expect(page.locator('text=R.*Atualizar')).toBeVisible();

      // Close modal
      await page.locator('button:has-text("Fechar")').click();
      await expect(helpModal).not.toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press('ArrowDown');
      // Second order should be highlighted
      const secondOrder = page.locator('[data-testid="order-card-2"]').locator('..');
      await expect(secondOrder).toHaveClass(/ring-2/);

      // Test refresh shortcut
      await page.keyboard.press('r');
      // Should trigger API call (check network or loading state)
      await waitForOrdersToLoad(page);
    });

    test('should manage sound settings', async ({ page }) => {
      const soundButton = page.locator('button[aria-label*="som"]');
      
      // Initially sound should be on
      await expect(soundButton).toHaveAttribute('aria-label', /Desativar som/);

      // Mute sound
      await soundButton.click();
      await expect(soundButton).toHaveAttribute('aria-label', /Ativar som/);

      // New alerts should not play sound
      // Trigger a new order alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('newOrder', { detail: { id: 5 } }));
      });

      // Alert should appear but no sound (we can't directly test audio)
      await expect(page.locator('[data-testid="alert-system"]')).toBeVisible();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle large number of orders efficiently', async ({ page }) => {
      // Mock large dataset
      const manyOrders = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        table_number: Math.floor(Math.random() * 20) + 1,
        status: ['pending', 'preparing', 'ready'][Math.floor(Math.random() * 3)],
        priority: ['normal', 'high', 'urgent'][Math.floor(Math.random() * 3)],
        items: [
          {
            item_id: i * 2 + 1,
            name: `Item ${i + 1}`,
            quantity: 1,
            status: 'pending',
            station: 'kitchen'
          }
        ],
        created_at: new Date(Date.now() - Math.random() * 3600000).toISOString()
      }));

      await page.route('**/api/v1/kds/orders', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(manyOrders)
        });
      });

      // Reload page to fetch many orders
      await page.reload();
      
      // Page should load without significant delay
      await expect(page.locator('[data-testid="order-card-1"]')).toBeVisible({ timeout: 5000 });
      
      // Statistics should show correct count
      await expect(page.locator('text=/Total: 100/')).toBeVisible();

      // Scrolling should be smooth (check if virtualization works)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => window.scrollTo(0, 0));
      
      // Interactions should remain responsive
      const firstOrder = page.locator('[data-testid="order-card-1"]');
      await firstOrder.locator('button').first().click();
    });

    test('should auto-refresh without disrupting user actions', async ({ page }) => {
      // Start an action
      const order = page.locator('[data-testid="order-card-1"]');
      await order.locator('button:has-text("Iniciar Preparo")').click();

      // Wait for auto-refresh interval (simulated)
      await page.waitForTimeout(2000);

      // Mock refreshed data
      await page.route('**/api/v1/kds/orders', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              table_number: 5,
              status: 'preparing', // Status should persist
              items: [],
              created_at: new Date().toISOString()
            }
          ])
        });
      });

      // Trigger refresh
      await page.keyboard.press('r');

      // Order status should remain updated
      await expect(order).toContainText('preparing');
    });
  });

  test.describe('Error Recovery', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Simulate API error
      await page.route('**/api/v1/kds/orders', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      // Trigger refresh
      await page.locator('button[aria-label="Atualizar pedidos"]').click();

      // Error message should appear
      await expect(page.locator('text=/Não foi possível|erro|Error/i')).toBeVisible();

      // Should still show cached data if available
      const orders = page.locator('[data-testid^="order-card-"]');
      const count = await orders.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should recover from WebSocket disconnection', async ({ page }) => {
      // Simulate WebSocket error
      await page.evaluate(() => {
        if ((window as any).ws) {
          (window as any).ws.close();
        }
      });

      // Should show reconnecting status
      await page.waitForTimeout(1000);
      
      // Should attempt to reconnect (check for reconnection indicator)
      // The actual implementation would show a reconnecting status
      
      // System should remain functional
      const order = page.locator('[data-testid="order-card-1"]');
      await order.locator('button').first().click();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interface
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      // Continue tabbing through controls
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
      }

      // Enter should activate focused button
      await page.keyboard.press('Enter');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for aria-labels on interactive elements
      const buttons = page.locator('button[aria-label]');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);

      // Check for role attributes
      const alerts = page.locator('[role="alert"]');
      await expect(alerts.first()).toBeVisible();

      // Check for status indicators
      const status = page.locator('[aria-live]');
      await expect(status.first()).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      // Check for semantic HTML
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();

      // Check for heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toHaveText('Kitchen Display');

      // Check for descriptive text
      const orders = page.locator('[data-testid^="order-card-"]');
      const firstOrder = orders.first();
      await expect(firstOrder).toContainText('Pedido');
    });
  });
});