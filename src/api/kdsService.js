const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.merchantgo.store/api/v1';
const OFFLINE_QUEUE_KEY = 'merchantgo.desktop.offline.queue';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
  return json.data ?? json;
}

export function authenticatePin(pin) {
  return request('/auth/pin', null, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export function loginMerchantGoAccount(email, password) {
  return request('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchActiveOrders(token) {
  const result = await request('/orders/active', token);
  return result.orders.map(order => ({
    ...order,
    server: order.waiter,
    time: 'Cloud',
  }));
}

export function executeCashout(token, type) {
  return request('/orders/corte-de-caja', token, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

export function transferCloudOrder(token, orderId, staffName) {
  return request(`/orders/${orderId}/transfer`, token, {
    method: 'POST',
    body: JSON.stringify({ staffName }),
  });
}

export function settleCloudOrder(token, orderId, paymentMethod) {
  return request('/orders/settle', token, {
    method: 'POST',
    body: JSON.stringify({ orderId, paymentMethod }),
  });
}

export function enqueueDesktopOperation(operation) {
  const queue = readDesktopQueue();
  queue.push(operation);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function readDesktopQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export async function flushDesktopQueue(token) {
  const queue = readDesktopQueue();
  if (!queue.length) return { synced: 0, remaining: 0 };

  const remaining = [];
  let synced = 0;
  for (const operation of queue) {
    try {
      if (operation.kind === 'settle_order') {
        await settleCloudOrder(token, operation.payload.orderId, operation.payload.paymentMethod);
      } else if (operation.kind === 'transfer_order') {
        await transferCloudOrder(token, operation.payload.orderId, operation.payload.staffName);
      } else if (operation.kind === 'cashout') {
        await executeCashout(token, operation.payload.type);
      }
      synced += 1;
    } catch {
      remaining.push(operation);
    }
  }
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return { synced, remaining: remaining.length };
}
