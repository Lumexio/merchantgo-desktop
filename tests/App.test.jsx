import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.jsx';
import { settleCloudOrder } from '../src/api/kdsService.js';
import {
  createLocalAdmin,
  createLocalOrder,
  listLocalOrders,
  settleLocalOrder,
  startLocalShift,
} from '../src/localPos.js';

describe('MerchantGo Desktop Application Smoke & Core Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the root entry point without crashing', () => {
    let html = '';
    expect(() => {
      html = renderToString(React.createElement(App));
    }).not.toThrow();

    expect(html).toContain('MerchantGo');
    expect(html).toContain('Sign In to MerchantGo');
  });

  it('settleCloudOrder correctly formats payload for express and account settlements', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } }),
    });
    global.fetch = fetchMock;

    // Express order payload
    await settleCloudOrder('test-token', {
      table: 'Express Counter',
      total: 45.0,
      items: ['Burger x1', 'Fries x1'],
    }, 'CASH');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.merchantgo.store/api/v1/orders/settle',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          paymentMethod: 'CASH',
          table: 'Express Counter',
          total: 45.0,
          items: ['Burger x1', 'Fries x1'],
        }),
      })
    );

    // Specific order ID payload
    await settleCloudOrder('test-token', 'ORD-12345', 'CARD');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.merchantgo.store/api/v1/orders/settle',
      expect.objectContaining({
        body: JSON.stringify({
          orderId: 'ORD-12345',
          paymentMethod: 'CARD',
        }),
      })
    );
  });

  it('manages local orders lifecycle in offline mode', async () => {
    await createLocalAdmin('Manager', '1234', 'SOLO_FOOD_TRUCK');
    await startLocalShift('1234');

    const order = createLocalOrder('Table 4', 25.5, ['Tacos x2']);
    expect(order.id).toBeDefined();
    expect(order.table).toBe('Table 4');
    expect(order.total).toBe(25.5);

    let openOrders = listLocalOrders();
    expect(openOrders.some(o => o.id === order.id)).toBe(true);

    settleLocalOrder(order.id, 'CASH');
    openOrders = listLocalOrders();
    expect(openOrders.some(o => o.id === order.id)).toBe(false);
  });
});
