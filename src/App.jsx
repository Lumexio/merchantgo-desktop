import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeftRight } from 'lucide-react';
import './index.css';
import {
  authenticatePin,
  executeCashout,
  fetchActiveOrders,
  flushDesktopQueue,
  enqueueDesktopOperation,
  loginMerchantGoAccount,
  settleCloudOrder,
  transferCloudOrder,
} from './api/kdsService';
import RegisterView from './RegisterView';
import {
  addLocalMenuItem,
  authenticateLocalPin,
  closeLocalShift,
  createLocalAdmin,
  getLocalCatalog,
  getLocalShift,
  getLocalShiftStats,
  hasLocalRegister,
  listLocalOrders,
  listSettledLocalOrders,
  removeLocalMenuItem,
  settleLocalOrder,
  startLocalShift,
  createLocalOrder,
  updateLocalOrder,
  refundLocalOrder,
} from './localPos';
import OnboardingConfigModal from './components/OnboardingConfigModal.jsx';

const DesktopModifierModal = ({ item, onClose, onConfirm }) => {
  const [selectedExtras, setSelectedExtras] = useState([]);
  const availableExtras = [
    { name: 'Extra Truffle Cream', price: 2.50 },
    { name: 'Double Protein Shot', price: 4.50 },
    { name: 'Side Avocado Salsa', price: 2.00 },
    { name: 'No Onions / Allergic', price: 0.00, alert: true }
  ];

  const toggleExtra = (extra) => {
    if (selectedExtras.some(e => e.name === extra.name)) setSelectedExtras(selectedExtras.filter(e => e.name !== extra.name));
    else setSelectedExtras([...selectedExtras, extra]);
  };

  const handleAdd = () => {
    const customTitle = `${item.name}${selectedExtras.length ? ' (+ ' + selectedExtras.map(e => e.name).join(', ') + ')' : ''}`;
    onConfirm(customTitle);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '480px', padding: '32px', position: 'relative' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', color: 'var(--text-main)' }}>Ticket Modifier</h2>
        <span style={{ fontSize: '1.2rem', color: '#00b368', fontWeight: 800, marginBottom: '24px', display: 'block' }}>{item.name}</span>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
          {availableExtras.map((ex, idx) => {
            const isSelected = selectedExtras.some(e => e.name === ex.name);
            return (
              <div key={idx} onClick={() => toggleExtra(ex)} style={{ padding: '16px', borderRadius: '12px', background: isSelected ? 'rgba(0, 179, 104, 0.15)' : 'var(--glass-overlay)', border: isSelected ? '2px solid #00b368' : '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ color: ex.alert ? 'var(--accent-error)' : 'var(--text-main)' }}>{ex.name}</span>
                <span style={{ color: '#00b368' }}>{ex.price > 0 ? `+$${ex.price.toFixed(2)}` : 'FREE'}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '14px' }}>Cancel</button>
          <button onClick={handleAdd} className="btn-pos" style={{ flex: 2, padding: '14px' }}>Confirm Modifiers & Save</button>
        </div>
      </div>
    </div>
  );
};

const LocalPinGate = ({ onAuthenticate }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const unlock = async () => {
    try {
      onAuthenticate(await authenticateLocalPin(pin));
    } catch (caught) {
      setError(caught.message || 'Invalid local staff PIN');
      setPin('');
    }
  };
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'grid', placeItems: 'center', color: 'var(--text-main)' }}>
      <div className="glass-panel" style={{ width: '380px', padding: '36px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '8px' }}>Terminal locked</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Enter your local staff PIN.</p>
        <input autoFocus type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={event => event.key === 'Enter' && unlock()} placeholder="Staff PIN" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,.4)', color: 'var(--text-main)', marginBottom: '12px' }} />
        {error && <p style={{ color: 'var(--accent-error)', marginBottom: '12px' }}>{error}</p>}
        <button onClick={unlock} className="btn-pos" style={{ width: '100%', padding: '14px' }}>Unlock terminal</button>
      </div>
    </div>
  );
};

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(() => !hasLocalRegister());
  const [isSettingUpOffline, setIsSettingUpOffline] = useState(false);
  const [localAdminName, setLocalAdminName] = useState('');
  const [localAdminPin, setLocalAdminPin] = useState('');
  const [localMode, setLocalMode] = useState('SOLO_FOOD_TRUCK');
  const [cloudPin, setCloudPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [kdsWarning, setKdsWarning] = useState(false);
  
  const [activeDesktopMod, setActiveDesktopMod] = useState(null);
  
  const [activeTab, setActiveTab] = useState('register');
  const [printerStatus, setPrinterStatus] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastZReport, setLastZReport] = useState(null);
  const [localShift, setLocalShift] = useState(() => getLocalShift());
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftPin, setShiftPin] = useState('');
  const [shiftError, setShiftError] = useState('');
  const [shiftStats, setShiftStats] = useState(() => getLocalShiftStats());
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedStaffForOrders, setSelectedStaffForOrders] = useState(null);
  const [menuItems, setMenuItems] = useState(() => getLocalCatalog());
  const [menuName, setMenuName] = useState('');
  const [menuCategory, setMenuCategory] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [isIngredient, setIsIngredient] = useState(false);

  useEffect(() => {
    // Listen to simulated Electron IPC signals if inside desktop executable
    if (window.merchantGoIPC) {
      window.merchantGoIPC.on('print-ticket-status', (msg) => {
        setPrinterStatus(msg.message);
        setTimeout(() => setPrinterStatus(null), 5000);
      });
      window.merchantGoIPC.on('drawer-status', (_msg) => {
        setDrawerOpen(true);
        setTimeout(() => setDrawerOpen(false), 8000);
      });
    }
  }, []);

  useEffect(() => {
    const handleKeydown = (e) => {
      // F1=Help, F2=New Order, F5=Refresh, Esc=Cancel (partial US-8.2 implementation)
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('register'); }
      if (e.key === 'F5') { e.preventDefault(); window.location.reload(); }
      if (e.key === 'Escape') setActiveDesktopMod(null);
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    if (session?.offline) {
      setAccounts(listLocalOrders().map(order => ({
        ...order,
        server: order.operatorName,
        time: 'Local',
        items: order.items || [],
      })));
      setShiftStats(getLocalShiftStats());
      setTransactionHistory(listSettledLocalOrders());
      return;
    }
    if (!session?.token) return;
    fetchActiveOrders(session.token)
      .then(cloudOrders => setAccounts(cloudOrders))
      .catch(error => setConnectionError(error.message));
  }, [session]);

  useEffect(() => {
    if (!session?.token || session?.offline) return;
    flushDesktopQueue(session.token).catch(() => null);
    
    // US-7.2 Background sync queue loop
    const interval = setInterval(() => {
      if (navigator.onLine) flushDesktopQueue(session.token).catch(() => null);
    }, 30000);
    
    const handleOnline = () => flushDesktopQueue(session.token).catch(() => null);
    window.addEventListener('online', handleOnline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [session?.token, session?.offline]);

  useEffect(() => {
    if (!session) return;
    let timer = window.setTimeout(() => setSession(null), 5 * 60 * 1000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSession(null), 5 * 60 * 1000);
    };
    const events = ['pointerdown', 'keydown'];
    events.forEach(event => window.addEventListener(event, reset));
    return () => {
      window.clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, reset));
    };
  }, [session]);

  // ponytail: Prevent closing app if offline queue is pending
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const queue = JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
      if (queue.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsynced offline orders! Please go online before closing.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handlePrintTicket = (ticketData) => {
    if (window.merchantGoIPC) {
      window.merchantGoIPC.send('print-ticket', ticketData || { ticket_id: 'Z-FULL-2026', total: '$249.70' });
    } else {
      setPrinterStatus('⚡ [Web Mode Simulation] Digital receipt formatted & PDF Z-Report audit compiled.');
      setTimeout(() => setPrinterStatus(null), 4500);
    }
  };

  const handleOpenDrawer = () => {
    if (window.merchantGoIPC) {
      window.merchantGoIPC.send('drawer-open', 'CASHIER_PIN_01');
    } else {
      setDrawerOpen(true);
      setTimeout(() => setDrawerOpen(false), 5000);
    }
  };

  const executeCorte = async (type) => {
    if (session?.token) {
      try {
        let result; try { result = await executeCashout(session.token, type); } catch(e) { if(e.message.includes('fetch') || e.message.includes('Network')) { enqueueDesktopOperation({ kind: 'cashout', payload: { type } }); return alert('Network error. Cashout queued for background sync.'); } else throw e; }
        const report = result.z_report_ticket;
        setLastZReport({
          id: `Z-${Date.now().toString(36).toUpperCase()}`,
          type: report.type,
          time: report.generated_at,
          gross_sales: `$${report.gross_revenue.toFixed(2)}`,
          cash_collected: `$${report.payment_breakdown.cash.toFixed(2)}`,
          card_settled: `$${report.payment_breakdown.card.toFixed(2)}`,
          waiter_tips_pool: `$${report.waiter_tips_pool.toFixed(2)}`,
          status: report.status,
        });
      } catch (error) {
        setConnectionError(error.message);
      }
      return;
    }
    try {
      const report = closeLocalShift();
      setLastZReport(report);
      handlePrintTicket(report);
      setLocalShift(null);
      alert(`${report.id} generated. The staff shift is closed and the terminal will lock.`);
      setSession(null);
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  const connectCloudStation = async () => {
    try {
      setConnectionError(null);
      setSession(await authenticatePin(cloudPin));
      setIsFirstLaunch(false);
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  const connectAccount = async () => {
    try {
      setConnectionError(null);
      setSession(await loginMerchantGoAccount(email, password));
      setIsFirstLaunch(false);
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  const can = (feature) => session?.entitlements?.features?.includes(feature);

  const settleAccount = async (id, method) => {
    if (!can('SETTLE_ORDER')) return;
    
    const targetAccount = accounts.find(a => a.id === id);
    if (!targetAccount) return;

    let amountStr = window.prompt(`Settle ${targetAccount.table} (Total: $${targetAccount.total.toFixed(2)}).\nEnter amount to pay now (or leave default for full checkout):`, targetAccount.total.toFixed(2));
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > targetAccount.total) return alert('Invalid amount.');
    const isPartial = amount < targetAccount.total;

    // ponytail: The Human Webhook pattern. Instead of building complex infrastructure, we pause execution
    // and force the cashier to visually verify the terminal screen before wiping the order from the system.
    if (method === 'CARD') {
      const approved = window.confirm(`Please process the card payment for $${amount.toFixed(2)} on the physical terminal. Did the terminal approve the payment?`);
      if (!approved) return;
    }
    
    try {
      if (session?.token) {
        if (isPartial) throw new Error('Cloud API does not support partial payments yet.');
        try { await settleCloudOrder(session.token, id, method); } catch(e) { if(e.message.includes('fetch') || e.message.includes('Network')) enqueueDesktopOperation({ kind: 'settle_order', payload: { orderId: id, paymentMethod: method } }); else throw e; }
        setAccounts(accounts.filter(account => account.id !== id));
      }
      else if (session?.offline) {
        if (!localShift) throw new Error('Start a staff shift before settling accounts');
        const remainder = settleLocalOrder(id, method, amount);
        setShiftStats(getLocalShiftStats());
        setTransactionHistory(listSettledLocalOrders());
        
        if (isPartial) {
          setAccounts(accounts.map(account => account.id === id ? { ...account, total: remainder } : account));
        } else {
          setAccounts(accounts.filter(account => account.id !== id));
        }
      }
      
      if (method === 'CASH') handleOpenDrawer();
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  const transferAccount = async (id) => {
    if (!can('TRANSFER_ORDER')) return;
    try {
      if (session?.token) { try { await transferCloudOrder(session.token, id, 'Manager Station'); } catch(e) { if(e.message.includes('fetch') || e.message.includes('Network')) enqueueDesktopOperation({ kind: 'transfer_order', payload: { orderId: id, staffName: 'Manager Station' } }); else throw e; } }
      setAccounts(accounts.map(account => account.id === id ? { ...account, server: 'Manager Station' } : account));
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  const handleAdjustTotal = (id) => {
    const targetAccount = accounts.find(a => a.id === id);
    if (!targetAccount) return;

    let newTotalStr = window.prompt(`Adjust Total for ${targetAccount.table} (Current: $${targetAccount.total.toFixed(2)}).\nEnter new total amount:`, targetAccount.total.toFixed(2));
    if (newTotalStr === null) return;
    const newTotal = Number(newTotalStr);
    if (isNaN(newTotal) || newTotal < 0) return alert('Invalid amount.');
    
    if (session?.offline) {
      // ponytail: Minimal offline override. Log it to the ticket so it shows on the receipt.
      const updatedItems = [...targetAccount.items, `[MANUAL ADJUSTMENT: $${newTotal.toFixed(2)}]`];
      updateLocalOrder(id, updatedItems, newTotal);
      setAccounts(accounts.map(a => a.id === id ? { ...a, total: newTotal, items: updatedItems } : a));
    } else {
      alert('Cloud API does not support manual total adjustments from the terminal yet.');
    }
  };

  const handleRefund = (id) => {
    if (!can('SETTLE_ORDER')) return;
    if (!window.confirm('Are you sure you want to void/refund this transaction? This cannot be undone.')) return;
    
    if (session?.offline) {
      try {
        refundLocalOrder(id);
        setShiftStats(getLocalShiftStats());
        setTransactionHistory(listSettledLocalOrders());
      } catch (e) {
        alert(e.message);
      }
    } else {
      alert('Cloud API refunds must be processed through the web admin dashboard.');
    }
  };

  if (isFirstLaunch) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0c10', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(24, 25, 33, 0.75)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border-glass)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '8px', color: 'var(--accent-success)' }}>MerchantGo</h1>
          <p style={{ color: '#9496a3', marginBottom: '32px' }}>Desktop Enterprise KDS & Register</p>
          {connectionError && <p style={{ color: 'var(--accent-error)', marginBottom: '16px' }}>{connectionError}</p>}
          
          {!isSettingUpOffline ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="email" placeholder="Owner email" value={email} onChange={event => setEmail(event.target.value)} style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
              <input type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent-success)', color: '#000', fontWeight: 700 }} onClick={connectAccount}>
                Sign In to MerchantGo
              </button>
              <div style={{ fontSize: '0.75rem', color: '#9496a3' }}>or use a configured paid staff station PIN</div>
              <input type="password" inputMode="numeric" placeholder="Staff PIN" value={cloudPin} onChange={event => setCloudPin(event.target.value)} style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)', color: 'var(--text-main)' }} onClick={connectCloudStation}>
                Connect Cloud Station
              </button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent-success)', color: '#000', fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsSettingUpOffline(true)}>
                Continue Offline (Local Database)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Create Local Admin</h2>
              <input type="text" placeholder="Admin Name (e.g. Boss)" value={localAdminName} onChange={e => setLocalAdminName(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
              <select value={localMode} onChange={event => setLocalMode(event.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#14171e', color: 'var(--text-main)' }}>
                <option value="SOLO_FOOD_TRUCK">Solo Food Truck</option>
                <option value="MULTI_STATION_BAR">Multi-station Restaurant / Bar</option>
              </select>
              <input type="password" inputMode="numeric" placeholder="4 digit staff PIN" value={localAdminPin} onChange={event => setLocalAdminPin(event.target.value.replace(/\D/g, '').slice(0, 4))} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent-success)', color: '#000', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }} onClick={async () => {
                try {
                  setConnectionError(null);
                  setSession(await createLocalAdmin(localAdminName, localAdminPin, localMode));
                  setIsFirstLaunch(false);
                } catch (error) {
                  setConnectionError(error.message);
                }
              }}>
                Initialize Local Terminal
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const menuInputStyle = {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,.1)',
    background: 'rgba(0,0,0,.35)',
    color: 'var(--text-main)',
  };

  if (!session && hasLocalRegister()) {
    return <LocalPinGate onAuthenticate={next => {
      setActiveTab('accounts');
      setSession(next);
    }} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* TERMINAL HEADER */}
      <header style={{ borderBottom: '1px solid var(--border-glass)', padding: '16px 24px', backgroundColor: 'var(--header-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), #993d00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 4px 15px rgba(var(--primary-rgb, 255, 107, 0), 0.4)' }}>
            D
          </div>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'Outfit', display: 'block' }}>
              MERCHANT<span style={{ color: 'var(--primary)' }}>GO</span> <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(var(--primary-rgb, 255, 107, 0), 0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '6px' }}>ELECTRON DESKTOP POS</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Console User: <strong>{session?.name} ({session?.role})</strong> • Plan: <strong>{session?.plan}</strong></span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setActiveTab('register')} className={activeTab === 'register' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            ⚡ Register (POS)
          </button>
          <button onClick={() => setActiveTab('accounts')} className={activeTab === 'accounts' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            Active Floor Accounts ({accounts.length})
          </button>
          <button onClick={() => setActiveTab('cashdrawer')} className={activeTab === 'cashdrawer' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            Cash Drawer & Float
          </button>
          <button onClick={() => setActiveTab('zreport')} className={activeTab === 'zreport' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem', backgroundColor: activeTab === 'zreport' ? 'var(--accent-success)' : '', color: activeTab === 'zreport' ? '#000' : '' }}>
            El Corte de Caja (Z-Report)
          </button>
          {session?.offline && session?.role === 'ADMIN' && (
            <button onClick={() => setActiveTab('menu')} className={activeTab === 'menu' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
              Menu ({menuItems.length})
            </button>
          )}
        </nav>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].includes(session?.role?.toUpperCase()) && (
            <select
              onChange={(e) => document.documentElement.setAttribute('data-theme', e.target.value)}
              style={{ background: 'var(--border-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '8px 14px', borderRadius: '12px', fontSize: '0.85rem', outline: 'none' }}
              title="Theme (Ponytail mode: minimal CSS-based themes)"
            >
              <option value="dark-default">Dark (Default)</option>
              <option value="light-default">Light</option>
              <option value="dark-ocean">Ocean</option>
              <option value="light-warm">Warm</option>
            </select>
          )}
          {session?.offline && (
            <button onClick={() => setShiftModalOpen(true)} className="btn-secondary" style={{ padding: '8px 14px', color: localShift ? 'var(--accent-success)' : '#ffb800' }}>
              {localShift ? `✓ Shift: ${localShift.staffName}` : 'Start staff shift'}
            </button>
          )}
          <button onClick={() => setSession(null)} className="btn-secondary" style={{ padding: '8px 14px' }}>🔒 Lock</button>
          <button onClick={() => handleOpenDrawer()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
            🔓 Open Drawer
          </button>
          <button onClick={() => handlePrintTicket()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <Printer size={16} /> Preview Receipt
          </button>
        </div>
      </header>

      {/* STATUS BANNER */}
      {kdsWarning && (
        <div style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', borderBottom: '1px solid #fff', padding: '12px 24px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#ffc107', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          ⚠️ KDS Unreachable — Print/Relay Manually
        </div>
      )}
      {(printerStatus || drawerOpen) && (
        <div style={{ backgroundColor: drawerOpen ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 107, 0, 0.2)', borderBottom: '1px solid #fff', padding: '12px 24px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: drawerOpen ? 'var(--accent-success)' : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {drawerOpen ? '🔓 CASH DRAWER UNLOCKED & TILL ACCESSED' : printerStatus}
        </div>
      )}
      {connectionError && (
        <div style={{ padding: '10px 24px', background: 'rgba(var(--accent-error-rgb, 255, 77, 77),.15)', color: 'var(--accent-error)', textAlign: 'center' }}>
          {connectionError}
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <main style={{ flex: 1, padding: '40px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        
        {/* TAB 0: REGISTER */}
        {activeTab === 'register' && (
          <RegisterView 
            menuItems={menuItems} 
            session={session}
            onSettle={async ({ items, total, method }) => {
              try {
                if (session?.offline) {
                  const order = createLocalOrder('Express Counter', total, items.map(i => `${i.name} x${i.qty}`));
                  settleLocalOrder(order.id, method);
                  setShiftStats(getLocalShiftStats());
                  setTransactionHistory(listSettledLocalOrders());
                  setKdsWarning(true);
                  setTimeout(() => setKdsWarning(false), 6000);
                } else if (session?.token) {
                  const payload = {
                    table: 'Express Counter',
                    total,
                    items: items.map(i => `${i.name} x${i.qty}`),
                  };
                  try {
                    await settleCloudOrder(session.token, payload, method);
                  } catch (e) {
                    if (e.message.includes('fetch') || e.message.includes('Network')) {
                      enqueueDesktopOperation({ kind: 'settle_order', payload: { orderId: payload, paymentMethod: method } });
                    } else throw e;
                  }
                }
                if (method === 'CASH') handleOpenDrawer();
                else alert(`Card terminal payment for $${total} completed.`);
              } catch (e) {
                alert(e.message);
              }
            }}
          />
        )}

        {/* TAB 1: ACCOUNTS SETTLEMENT */}
        {activeTab === 'accounts' && (
          <div>
            {session?.offline && menuItems.length === 0 && (
              <div className="glass-box" style={{ padding: '24px', marginBottom: '28px', border: '1px dashed var(--accent-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                <div>
                  <strong style={{ color: 'var(--accent-success)' }}>1. Create your menu</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>This fresh offline terminal starts empty. Add the food and drinks you sell before opening your first account.</p>
                </div>
                <button onClick={() => setActiveTab('menu')} className="btn-pos" style={{ padding: '12px 18px' }}>Open Menu Setup</button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '6px' }}>Table Account Settlement Console</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                  Select an account initiated via waitstaff shared PIN tablets to process cash or card terminal checkouts.
                </p>
              </div>
              <span style={{ fontSize: '0.9rem', padding: '8px 16px', background: 'var(--glass-overlay)', borderRadius: '10px', color: 'var(--accent-success)', fontWeight: 700 }}>
                ● Real-Time WebSocket Listener Active
              </span>
            </div>

            {/* CASHIER DASHBOARD (US-3.1 & US-3.2) */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
              <div className="glass-box" style={{ flex: 1, padding: '24px', background: 'linear-gradient(135deg, rgba(0, 255, 102, 0.05), transparent)' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Shift Total Sales</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-success)' }}>${shiftStats.totalSales.toFixed(2)}</div>
              </div>
              <div className="glass-box" style={{ flex: 2, padding: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Top Waiters (Shift)</h3>
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
                  {shiftStats.topWaiters.length > 0 ? shiftStats.topWaiters.map((w, idx) => (
                    <div key={idx} style={{ background: 'var(--glass-overlay)', padding: '12px 20px', borderRadius: '10px', minWidth: '140px' }}>
                      <div style={{ fontWeight: 700 }}>#{idx + 1} {w.name}</div>
                      <div style={{ color: 'var(--accent-success)', marginTop: '4px' }}>${w.sales.toFixed(2)}</div>
                    </div>
                  )) : <span style={{ color: 'var(--text-muted)' }}>No settled orders yet.</span>}
                </div>
              </div>
            </div>

              {/* TRANSACTION HISTORY (US-4.4) */}
              {transactionHistory.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '16px' }}>Shift Transaction History</h3>
                  <div className="glass-box" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--glass-overlay)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        <tr>
                          <th style={{ padding: '16px' }}>Time</th>
                          <th style={{ padding: '16px' }}>Table/Order</th>
                          <th style={{ padding: '16px' }}>Server</th>
                          <th style={{ padding: '16px' }}>Method</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionHistory.slice().reverse().map(txn => (
                            <tr key={txn.id} style={{ borderTop: '1px solid var(--border-glass)', opacity: txn.status === 'REFUNDED' ? 0.5 : 1 }}>
                              <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(txn.settledAt).toLocaleTimeString()}</td>
                              <td style={{ padding: '16px', fontWeight: 600 }}>{txn.table}</td>
                              <td style={{ padding: '16px' }}>{txn.operatorName}</td>
                              <td style={{ padding: '16px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: txn.paymentMethod === 'CASH' ? 'rgba(0, 255, 102, 0.1)' : 'rgba(33, 150, 243, 0.1)', color: txn.paymentMethod === 'CASH' ? 'var(--accent-success)' : '#2196F3' }}>
                                  {txn.paymentMethod}
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-success)', textDecoration: txn.status === 'REFUNDED' ? 'line-through' : 'none' }}>${txn.total.toFixed(2)}</td>
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                {txn.status === 'REFUNDED' ? <span style={{ color: '#ff4444', fontSize: '0.8rem' }}>REFUNDED</span> : 
                                <button onClick={() => handleRefund(txn.id)} disabled={!can('SETTLE_ORDER')} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: can('SETTLE_ORDER') ? 1 : 0.5, border: '1px solid rgba(255, 68, 68, 0.3)', color: '#ff4444' }}>Void</button>}
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Ponytail: Staff vs Cashier split view for Accounts */}
            {['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].includes(session?.role?.toUpperCase()) && !selectedStaffForOrders ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {Array.from(new Set(accounts.map(a => a.server))).map(staffName => {
                  const staffOrders = accounts.filter(a => a.server === staffName);
                  const total = staffOrders.reduce((s, a) => s + a.total, 0);
                  return (
                    <div key={staffName} onClick={() => setSelectedStaffForOrders(staffName)} className="glass-box" style={{ cursor: 'pointer', padding: '24px', borderTop: '4px solid var(--primary)', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{staffName}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Role: Floor Staff</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'var(--glass-overlay)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem' }}>{staffOrders.length} active orders</span>
                        <strong style={{ color: 'var(--accent-success)', fontSize: '1.2rem' }}>${total.toFixed(2)}</strong>
                      </div>
                    </div>
                  );
                })}
                {accounts.length === 0 && <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No active orders on the floor.</div>}
              </div>
            ) : (
              <>
                {['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].includes(session?.role?.toUpperCase()) && selectedStaffForOrders && (
                  <button onClick={() => setSelectedStaffForOrders(null)} className="btn-secondary" style={{ marginBottom: '24px', padding: '8px 16px' }}>← Back to Staff Grid</button>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '26px' }}>
                  {(['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].includes(session?.role?.toUpperCase()) ? accounts.filter(a => a.server === selectedStaffForOrders) : accounts.filter(a => a.server === session?.name)).map((acc) => (
                    <div key={acc.id} className="glass-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: acc.status === 'READY_TO_PAY' ? '4px solid var(--accent-success)' : '4px solid var(--primary)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', padding: '4px 12px', background: 'var(--border-glass)', borderRadius: '8px', fontFamily: 'Outfit' }}>
                            {acc.id}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: acc.status === 'READY_TO_PAY' ? 'var(--accent-success)' : 'var(--primary)' }}>
                            {acc.status} • {acc.time}
                          </span>
                        </div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                          Assigned Waitstaff: <strong style={{ color: 'var(--text-main)' }}>{acc.server}</strong>
                        </div>

                        <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '12px', marginBottom: '20px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Line Item Orders</span>
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.92rem', color: '#ddd' }}>
                            {acc.items.map((i, idx) => (
                              <li key={idx} style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--glass-overlay)', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span onClick={() => setActiveDesktopMod({ accId: acc.id, itemIdx: idx, itemName: i })} style={{ cursor: 'pointer', flex: 1 }}>▪ {i}</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <span onClick={() => setActiveDesktopMod({ accId: acc.id, itemIdx: idx, itemName: i })} style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: 800, padding: '2px 8px', background: 'rgba(0,255,102,0.1)', borderRadius: '4px' }}>+ MOD</span>
                                  <span onClick={(e) => {
                                    e.stopPropagation();
                                    if (!session?.offline) return alert('Cloud sync does not support removing items yet.');
                                    const updatedItems = acc.items.filter((_, index) => index !== idx);
                                    updateLocalOrder(acc.id, updatedItems, acc.total);
                                    setAccounts(accounts.map(a => a.id === acc.id ? { ...a, items: updatedItems } : a));
                                  }} style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent-error, #ff4444)', fontWeight: 800, padding: '2px 8px', background: 'rgba(255,68,68,0.1)', borderRadius: '4px' }}>X</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <button onClick={() => handleAdjustTotal(acc.id)} className="btn-secondary" style={{ width: '100%', marginTop: '12px', fontSize: '0.8rem', padding: '8px', border: '1px dashed var(--border-glass)' }}>
                            + Adjust Total / Apply Discount
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', paddingTop: '14px', borderTop: '1px solid var(--glass-overlay-hover)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Amount Due (No Tip Included):</span>
                          <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-main)' }}>${acc.total.toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <button disabled={!can('SETTLE_ORDER')} onClick={() => settleAccount(acc.id, 'CASH')} className="btn-pos" style={{ padding: '14px', fontSize: '0.95rem', background: '#00cc52', color: '#000', opacity: can('SETTLE_ORDER') ? 1 : 0.5 }}>
                            💵 Cash Settle
                          </button>
                          <button disabled={!can('SETTLE_ORDER')} onClick={() => settleAccount(acc.id, 'CARD')} className="btn-pos" style={{ padding: '14px', fontSize: '0.95rem', opacity: can('SETTLE_ORDER') ? 1 : 0.5 }}>
                            💳 Card Terminal
                          </button>
                        </div>
                        <button disabled={!can('TRANSFER_ORDER')} onClick={() => transferAccount(acc.id)} className="btn-secondary" style={{ width: '100%', marginTop: '10px', fontSize: '0.8rem', padding: '10px', opacity: can('TRANSFER_ORDER') ? 1 : 0.5 }}>
                          <ArrowLeftRight size={14} /> Transfer Table Account
                        </button>
                      </div>
                    </div>
                  ))}
                  {((['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].includes(session?.role?.toUpperCase()) ? accounts.filter(a => a.server === selectedStaffForOrders) : accounts.filter(a => a.server === session?.name)).length === 0) && (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>You have no active orders.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'menu' && session?.offline && session?.role === 'ADMIN' && (
          <div className="glass-box" style={{ maxWidth: '900px', margin: '0 auto', padding: '36px' }}>
            <h1 style={{ marginBottom: '8px' }}>Offline Menu Setup</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Add only the items this business sells. They remain local until you explicitly sync them.</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button onClick={() => setIsIngredient(false)} className={!isIngredient ? 'btn-pos' : 'btn-secondary'} style={{ flex: 1, padding: '10px' }}>Menu Item</button>
              <button onClick={() => setIsIngredient(true)} className={isIngredient ? 'btn-pos' : 'btn-secondary'} style={{ flex: 1, padding: '10px' }}>Ingredient</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '24px' }}>
              <input value={menuName} onChange={event => setMenuName(event.target.value)} placeholder={isIngredient ? 'Ingredient name' : 'Item name'} style={menuInputStyle} />
              <input value={menuCategory} onChange={event => setMenuCategory(event.target.value)} placeholder="Category" style={menuInputStyle} />
              <input type="number" min="0" step="0.01" value={menuPrice} onChange={event => setMenuPrice(event.target.value)} placeholder={isIngredient ? 'Cost (optional)' : 'Price'} style={menuInputStyle} />
              <button onClick={() => {
                try {
                  // ponytail: minimal type forwarding
                  setMenuItems(addLocalMenuItem(menuName, menuCategory, Number(menuPrice) || 0, isIngredient ? 'INGREDIENT' : 'ITEM'));
                  setMenuName('');
                  setMenuPrice('');
                  setConnectionError(null);
                } catch (error) {
                  setConnectionError(error.message);
                }
              }} className="btn-pos" style={{ padding: '12px 18px' }}>Add {isIngredient ? 'Ingredient' : 'item'}</button>
            </div>
            {menuItems.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,.2)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                No menu items yet. Add your first product above.
              </div>
            ) : menuItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <span><strong>{item.name}</strong> · {item.category} · ${Number(item.price).toFixed(2)} {item.type === 'INGREDIENT' && <span style={{color: '#ffb800'}}>[INGREDIENT]</span>}</span>
                <button onClick={() => setMenuItems(removeLocalMenuItem(item.id))} className="btn-secondary">Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: CASH DRAWER */}
        {activeTab === 'cashdrawer' && (
          <div className="glass-box" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '14px' }}>Cash Drawer & Till Float Management</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '32px' }}>
              Manage the local cash register float and authenticated MerchantGo session status.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>Current Cash Float</span>
                <strong style={{ fontSize: '2.4rem', color: 'var(--accent-success)', fontFamily: 'Outfit' }}>$4,120.50 MXN</strong>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>Drawer Lock State</span>
                <strong style={{ fontSize: '2rem', color: drawerOpen ? 'var(--accent-success)' : 'var(--primary)', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {drawerOpen ? '🔓 UNLOCKED' : '🔒 LOCKED'}
                </strong>
              </div>
            </div>

            <button onClick={handleOpenDrawer} className="btn-pos" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
              Open Digital Register Session →
            </button>
          </div>
        )}

        {/* TAB 3: EL CORTE DE CAJA (Z-REPORT) */}
        {activeTab === 'zreport' && (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(0, 255, 102, 0.15)', padding: '4px 14px', borderRadius: '999px', display: 'inline-block', marginBottom: '14px' }}>
                Shift Cashout & Digital Audit Exporting
              </span>
              <h1 style={{ fontSize: '3rem', marginBottom: '12px' }}>El Corte de Caja (Z-Report)</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
                Compile settled shift revenue, separate cash vs. card balances, and calculate waiter tip pools from authenticated MerchantGo orders.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '26px', marginBottom: '40px' }}>
              <div className="glass-box" style={{ borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>General Shift Cashout ("Corte General")</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
                    Closes out all server PIN accounts across the floor, locks the active shift timestamp, and generates the consolidated enterprise Z-Report ticket.
                  </p>
                </div>
                <button disabled={!can('GENERAL_CASHOUT')} onClick={() => executeCorte('GENERAL')} className="btn-pos" style={{ width: '100%', padding: '14px', fontSize: '1.05rem', opacity: can('GENERAL_CASHOUT') ? 1 : 0.5 }}>
                  {can('GENERAL_CASHOUT') ? 'Execute General Corte →' : 'Enterprise Admin Required'}
                </button>
              </div>

              <div className="glass-box" style={{ borderTop: '4px solid var(--accent-success)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Individual Server Cashout</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
                    Reconciles assigned accounts for a single waiter or bartender concluding their shift early without interrupting general bar operations.
                  </p>
                </div>
                <button disabled={!can('INDIVIDUAL_CASHOUT')} onClick={() => executeCorte('INDIVIDUAL')} className="btn-pos" style={{ width: '100%', padding: '14px', fontSize: '1.05rem', background: '#00cc52', color: '#000' }}>
                  Execute Server Reconcile →
                </button>
              </div>
            </div>

            {/* Generated Ticket output */}
            {lastZReport && (
              <div className="glass-box" style={{ border: '2px solid var(--accent-success)', background: 'var(--bg-card)', padding: '36px', animation: 'fadeIn 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '18px', marginBottom: '22px' }}>
                  <div>
                    <span style={{ color: 'var(--accent-success)', fontWeight: 800, fontSize: '0.85rem', display: 'block' }}>✔ Z-REPORT TICKET #{lastZReport.id} GENERATED</span>
                    <h3 style={{ fontSize: '1.8rem' }}>{lastZReport.type}</h3>
                  </div>
                  <button onClick={() => handlePrintTicket(lastZReport)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--accent-success)', color: '#000', fontWeight: 800 }}>
                    <Printer size={16} /> Export Audit PDF Ticket
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Gross Revenue</span>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{lastZReport.gross_sales}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Cash Collected</span>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--accent-success)' }}>{lastZReport.cash_collected}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Card Terminal</span>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{lastZReport.card_settled}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Staff Tips Pool</span>
                    <strong style={{ fontSize: '1.5rem', color: '#ffb800' }}>{lastZReport.waiter_tips_pool}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <span>Timestamp: <strong>{lastZReport.time}</strong></span>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>● {lastZReport.status}</span>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      <footer style={{ borderTop: '1px solid var(--border-glass)', padding: '20px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', backgroundColor: '#07080b' }}>
        © 2026 MerchantGo Electron Desktop Terminal • Authenticated tenant and branch scope enforced by the API
      </footer>

      {activeDesktopMod && (
        <DesktopModifierModal 
          item={{ name: activeDesktopMod.itemName }} 
          onClose={() => setActiveDesktopMod(null)} 
          onConfirm={(newString) => {
            const updated = [...accounts];
            const accIndex = updated.findIndex(a => a.id === activeDesktopMod.accId);
            const order = updated[accIndex];
            order.items[activeDesktopMod.itemIdx] = newString;
            if (session?.offline) {
              updateLocalOrder(order.id, order.items, order.total);
            }
            setAccounts(updated);
            setActiveDesktopMod(null);
          }} 
        />
      )}
      {shiftModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center' }}>
          <div className="glass-panel" style={{ width: '420px', padding: '32px' }}>
            <h2 style={{ marginBottom: '8px' }}>{localShift ? 'Active staff shift' : 'Start staff shift'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '18px' }}>
              {localShift ? `Started ${new Date(localShift.openedAt).toLocaleString()}. Generate a Z-report to end it.` : 'Enter your local staff PIN.'}
            </p>
            {!localShift && <input autoFocus type="password" inputMode="numeric" value={shiftPin} onChange={event => setShiftPin(event.target.value.replace(/\D/g, '').slice(0, 8))} onKeyDown={async event => {
              if (event.key !== 'Enter') return;
              try {
                const next = await startLocalShift(shiftPin);
                setLocalShift(next);
                setShiftModalOpen(false);
                setShiftPin('');
                setShiftError('');
              } catch (error) {
                setShiftError(error.message);
              }
            }} placeholder="Staff PIN" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,.4)', color: 'var(--text-main)', marginBottom: '12px' }} />}
            {shiftError && <p style={{ color: 'var(--accent-error)', marginBottom: '12px' }}>{shiftError}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShiftModalOpen(false); setShiftError(''); }} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Close</button>
              {!localShift && <button onClick={async () => {
                try {
                  const next = await startLocalShift(shiftPin);
                  setLocalShift(next);
                  setShiftModalOpen(false);
                  setShiftPin('');
                  setShiftError('');
                } catch (error) {
                  setShiftError(error.message);
                }
              }} className="btn-pos" style={{ flex: 2, padding: '12px' }}>Start shift</button>}
            </div>
          </div>
        </div>
      )}
      <OnboardingConfigModal session={session} />
    </div>
  );
}
