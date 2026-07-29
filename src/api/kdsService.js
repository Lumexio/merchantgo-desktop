const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.merchantgo.store/api/v1';

export async function fetchActiveOrders() {
  try {
    const res = await fetch(`${API_URL}/orders/active`, {
      headers: { 'x-merchantgo-pin': '9012' }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("KDS disconnected from cloud server. Displaying local bridge state.");
    return [];
  }
}
