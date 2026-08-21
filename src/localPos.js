const PREFIX = 'merchantgo.desktop.local.';
const CONFIG_KEY = `${PREFIX}config`;
const SHIFT_KEY = `${PREFIX}shift`;
const ORDERS_KEY = `${PREFIX}orders`;
const SHIFTS_KEY = `${PREFIX}closed-shifts`;
const REPORTS_KEY = `${PREFIX}zreports`;
const CATALOG_KEY = `${PREFIX}catalog`;
const SNAPSHOT_SCHEMA = 'merchantgo.snapshot';
const SNAPSHOT_VERSION = 2;

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || '');
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function config() {
  return read(CONFIG_KEY, null);
}

function requireConfig() {
  const value = config();
  if (!value) throw new Error('Initialize the local terminal first');
  return value;
}

async function hashPin(pin) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function assertPin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('Use a 4 digit staff PIN');
}

function sessionFor(staff, local) {
  const multiStation = local.mode === 'MULTI_STATION_BAR';
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    plan: 'FREE',
    mode: local.mode,
    offline: true,
    entitlements: {
      features: [
        'CREATE_ORDER',
        'SETTLE_ORDER',
        'VIEW_ANALYTICS',
        ...(['ADMIN', 'OWNER'].includes(staff.role) ? ['TRANSFER_ORDER', 'MANAGE_MENU', 'INDIVIDUAL_CASHOUT', 'GENERAL_CASHOUT'] : []),
        ...(multiStation && ['ADMIN', 'OWNER'].includes(staff.role) ? ['MANAGE_STAFF'] : []),
      ],
      limits: { menuItems: 25, staff: multiStation ? 10 : 1, branches: 1 },
    },
  };
}

function mergeCollection(local, incoming, mutable, policy) {
  const merged = new Map(local.map(record => [record.id, record]));
  for (const record of incoming) {
    const current = merged.get(record.id);
    if (!current || (mutable && current.revision !== record.revision && policy === 'remote')) {
      merged.set(record.id, record);
    }
  }
  return [...merged.values()];
}

export function hasLocalRegister() {
  return Boolean(config()?.staff?.length);
}

export function getLocalMode() {
  return config()?.mode || 'SOLO_FOOD_TRUCK';
}

export async function createLocalAdmin(name, pin, mode = 'SOLO_FOOD_TRUCK') {
  assertPin(pin);
  const deviceId = crypto.randomUUID();
  const staff = {
    id: crypto.randomUUID(),
    deviceId,
    revision: 1,
    name: name.trim() || 'Local Admin',
    role: 'OWNER',
    active: true,
    pinHash: await hashPin(pin),
  };
  const local = { deviceId, businessName: 'My Business', mode, staff: [staff] };
  write(CONFIG_KEY, local);
  return sessionFor(staff, local);
}

export async function addLocalStaff(name, pin) {
  assertPin(pin);
  const local = requireConfig();
  if (local.mode === 'SOLO_FOOD_TRUCK') throw new Error('Solo Food Truck mode uses the admin as its only operator');
  const pinHash = await hashPin(pin);
  if (local.staff.some(member => member.pinHash === pinHash)) throw new Error('That PIN is already assigned');
  local.staff.push({
    id: crypto.randomUUID(),
    deviceId: local.deviceId,
    revision: 1,
    name: name.trim() || 'Crew Member',
    role: 'CASHIER',
    active: true,
    pinHash,
  });
  write(CONFIG_KEY, local);
}

export async function authenticateLocalPin(pin) {
  const local = requireConfig();
  const pinHash = await hashPin(pin);
  const staff = local.staff.find(member => member.active && member.pinHash === pinHash);
  if (!staff) throw new Error('Invalid local staff PIN');
  const shift = getLocalShift();
  if (shift && shift.staffId !== staff.id) throw new Error(`${shift.staffName} must close the current shift first`);
  return sessionFor(staff, local);
}

export function getLocalShift() {
  return read(SHIFT_KEY, null);
}

export async function startLocalShift(pin) {
  const staff = await authenticateLocalPin(pin);
  const existing = getLocalShift();
  if (existing) return existing;
  const shift = { id: crypto.randomUUID(), staffId: staff.id, staffName: staff.name, openedAt: new Date().toISOString() };
  write(SHIFT_KEY, shift);
  return shift;
}

export function listLocalOrders() {
  return read(ORDERS_KEY, []).filter(order => order.status === 'OPEN');
}

export function listSettledLocalOrders() {
  const shift = getLocalShift();
  return read(ORDERS_KEY, []).filter(o => o.status === 'SETTLED' && o.shiftId === shift?.id);
}

export function getLocalShiftStats() {
  const shift = getLocalShift();
  if (!shift) return { totalSales: 0, topWaiters: [] };
  const allOrders = read(ORDERS_KEY, []);
  const settledShiftOrders = allOrders.filter(o => o.status === 'SETTLED' && o.shiftId === shift.id);
  
  const totalSales = settledShiftOrders.reduce((sum, o) => sum + o.total, 0);
  
  const waiterMap = {};
  for (const o of settledShiftOrders) {
    if (!waiterMap[o.operatorName]) waiterMap[o.operatorName] = 0;
    waiterMap[o.operatorName] += o.total;
  }
  
  const topWaiters = Object.entries(waiterMap)
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return { totalSales, topWaiters };
}

export function createLocalOrder(table, total, items = []) {
  const local = requireConfig();
  const shift = getLocalShift();
  if (!shift) throw new Error('Start a staff shift before creating accounts');
  const order = {
    id: crypto.randomUUID(),
    deviceId: local.deviceId,
    revision: 1,
    shiftId: shift.id,
    operatorId: shift.staffId,
    operatorName: shift.staffName,
    table,
    total: Number(total) || 0,
    items,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
  write(ORDERS_KEY, [...read(ORDERS_KEY, []), order]);
  return order;
}

export function settleLocalOrder(orderId, paymentMethod) {
  const orders = read(ORDERS_KEY, []);
  const settledAt = new Date().toISOString();
  const order = orders.find(entry => entry.id === orderId);
  if (!order) throw new Error('Local account not found');
  write(ORDERS_KEY, orders.map(entry => entry.id === orderId
    ? { ...entry, status: 'SETTLED', paymentMethod, settledAt }
    : entry));
}

export function getLocalCatalog() {
  return read(CATALOG_KEY, []);
}

export function addLocalMenuItem(name, category, price, type = 'ITEM') {
  const local = requireConfig();
  const items = getLocalCatalog();
  if (!name.trim()) throw new Error('Menu item name is required');
  if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid price or cost');
  if (items.length >= 25) throw new Error('Free offline menus support up to 25 items');
  const next = [...items, {
    id: `ITEM-${Date.now().toString(36).toUpperCase()}`,
    deviceId: local.deviceId,
    revision: 1,
    name: name.trim(),
    category: category.trim() || (type === 'INGREDIENT' ? 'Ingredient' : 'Menu'),
    price,
    active: true,
    type,
  }];
  write(CATALOG_KEY, next);
  return next;
}

export function removeLocalMenuItem(id) {
  const next = getLocalCatalog().filter(item => item.id !== id);
  write(CATALOG_KEY, next);
  return next;
}

export function closeLocalShift() {
  const local = requireConfig();
  const shift = getLocalShift();
  if (!shift) throw new Error('Start a staff shift before generating a Z-report');
  const closedAt = new Date().toISOString();
  const orders = read(ORDERS_KEY, []);
  const shiftOrders = orders.filter(order => order.status === 'SETTLED' && order.shiftId === shift.id);
  const gross = shiftOrders.reduce((sum, order) => sum + order.total, 0);
  const report = {
    id: `Z-${Date.now().toString(36).toUpperCase()}`,
    deviceId: local.deviceId,
    revision: 1,
    shiftId: shift.id,
    type: 'LOCAL SHIFT',
    staffName: shift.staffName,
    openedAt: shift.openedAt,
    closedAt,
    time: closedAt,
    grossRevenue: gross,
    cash: shiftOrders.filter(order => order.paymentMethod === 'CASH').reduce((sum, order) => sum + order.total, 0),
    card: shiftOrders.filter(order => order.paymentMethod === 'CARD').reduce((sum, order) => sum + order.total, 0),
    orderCount: shiftOrders.length,
    gross_sales: `$${gross.toFixed(2)}`,
    cash_collected: `$${shiftOrders.filter(order => order.paymentMethod === 'CASH').reduce((sum, order) => sum + order.total, 0).toFixed(2)}`,
    card_settled: `$${shiftOrders.filter(order => order.paymentMethod === 'CARD').reduce((sum, order) => sum + order.total, 0).toFixed(2)}`,
    waiter_tips_pool: '$0.00',
    status: 'SHIFT CLOSED',
  };
  write(ORDERS_KEY, orders.map(order => order.shiftId === shift.id ? { ...order, closedShiftId: shift.id } : order));
  write(SHIFTS_KEY, [...read(SHIFTS_KEY, []), { ...shift, deviceId: local.deviceId, revision: 1, closedAt }]);
  write(REPORTS_KEY, [...read(REPORTS_KEY, []), report]);
  localStorage.removeItem(SHIFT_KEY);
  return report;
}

export function createLocalSnapshot() {
  const local = requireConfig();
  return {
    schema: SNAPSHOT_SCHEMA,
    version: SNAPSHOT_VERSION,
    deviceId: local.deviceId,
    exportedAt: new Date().toISOString(),
    data: {
      menuItems: getLocalCatalog(),
      branches: [{ id: 'branch_root', deviceId: local.deviceId, revision: 1, name: local.businessName }],
      staffProfiles: local.staff.map(({ pinHash: _pinHash, ...staff }) => staff),
      orders: read(ORDERS_KEY, []).filter(order => Boolean(order.closedShiftId)),
      shifts: read(SHIFTS_KEY, []),
      zReports: read(REPORTS_KEY, []),
    },
  };
}

export function previewLocalMerge(snapshot) {
  if (snapshot?.schema !== SNAPSHOT_SCHEMA || snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error('Unsupported MerchantGo snapshot');
  }
  const local = createLocalSnapshot();
  const mutable = ['menuItems', 'branches', 'staffProfiles'];
  const collections = [...mutable, 'orders', 'shifts', 'zReports'];
  const additions = {};
  const conflicts = [];
  for (const key of collections) {
    const current = new Map(local.data[key].map(record => [record.id, record]));
    additions[key] = snapshot.data[key].filter(record => !current.has(record.id)).length;
    if (mutable.includes(key)) {
      for (const record of snapshot.data[key]) {
        const existing = current.get(record.id);
        if (existing && existing.revision !== record.revision) conflicts.push({ collection: key, id: record.id });
      }
    }
  }
  return { additions, conflicts };
}

export function commitLocalMerge(snapshot, policy = 'local') {
  previewLocalMerge(snapshot);
  const local = requireConfig();
  write(CATALOG_KEY, mergeCollection(read(CATALOG_KEY, []), snapshot.data.menuItems, true, policy));
  const currentProfiles = local.staff.map(({ pinHash: _pinHash, ...staff }) => staff);
  const profiles = mergeCollection(currentProfiles, snapshot.data.staffProfiles, true, policy);
  local.staff = profiles.map(profile => ({
    ...profile,
    pinHash: local.staff.find(staff => staff.id === profile.id)?.pinHash || '',
  }));
  write(CONFIG_KEY, local);
  write(ORDERS_KEY, mergeCollection(read(ORDERS_KEY, []), snapshot.data.orders, false, policy));
  write(SHIFTS_KEY, mergeCollection(read(SHIFTS_KEY, []), snapshot.data.shifts, false, policy));
  write(REPORTS_KEY, mergeCollection(read(REPORTS_KEY, []), snapshot.data.zReports, false, policy));
}
