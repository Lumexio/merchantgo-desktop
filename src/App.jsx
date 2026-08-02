import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeftRight } from 'lucide-react';
import './index.css';
import {
  authenticatePin,
  executeCashout,
  fetchActiveOrders,
  flushDesktopQueue,
  loginMerchantGoAccount,
  settleCloudOrder,
  transferCloudOrder,
} from './api/kdsService';
import {
  addLocalStaff,
  authenticateLocalPin,
  closeLocalShift,
  createLocalAdmin,
  createLocalOrder,
  getLocalShift,
  getLocalMode,
  hasLocalRegister,
  listLocalOrders,
  settleLocalOrder,
  startLocalShift,
} from './localPos';

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
        <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', color: '#fff' }}>Ticket Modifier</h2>
        <span style={{ fontSize: '1.2rem', color: '#00b368', fontWeight: 800, marginBottom: '24px', display: 'block' }}>{item.name}</span>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
          {availableExtras.map((ex, idx) => {
            const isSelected = selectedExtras.some(e => e.name === ex.name);
            return (
              <div key={idx} onClick={() => toggleExtra(ex)} style={{ padding: '16px', borderRadius: '12px', background: isSelected ? 'rgba(0, 179, 104, 0.15)' : 'rgba(255,255,255,0.04)', border: isSelected ? '2px solid #00b368' : '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ color: ex.alert ? '#ff8585' : '#fff' }}>{ex.name}</span>
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
    <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'grid', placeItems: 'center', color: '#fff' }}>
      <div className="glass-panel" style={{ width: '380px', padding: '36px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '8px' }}>Terminal locked</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Enter your local staff PIN.</p>
        <input autoFocus type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={event => event.key === 'Enter' && unlock()} placeholder="Staff PIN" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,.4)', color: '#fff', marginBottom: '12px' }} />
        {error && <p style={{ color: '#ff8585', marginBottom: '12px' }}>{error}</p>}
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
  
  const [activeDesktopMod, setActiveDesktopMod] = useState(null);
  
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'cashdrawer' | 'zreport'
  const [printerStatus, setPrinterStatus] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastZReport, setLastZReport] = useState(null);
  const [localShift, setLocalShift] = useState(() => getLocalShift());
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftPin, setShiftPin] = useState('');
  const [shiftError, setShiftError] = useState('');
  const [accounts, setAccounts] = useState([]);

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
    if (session?.offline) {
      setAccounts(listLocalOrders().map(order => ({
        ...order,
        server: order.operatorName,
        time: 'Local',
        items: order.items || [],
      })));
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
        const result = await executeCashout(session.token, type);
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
    try {
      if (session?.token) await settleCloudOrder(session.token, id, method);
      else if (session?.offline) {
        if (!localShift) throw new Error('Start a staff shift before settling accounts');
        settleLocalOrder(id, method);
      }
      setAccounts(accounts.filter(account => account.id !== id));
      if (method === 'CASH') handleOpenDrawer();
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  const transferAccount = async (id) => {
    if (!can('TRANSFER_ORDER')) return;
    try {
      if (session?.token) await transferCloudOrder(session.token, id, 'Manager Station');
      setAccounts(accounts.map(account => account.id === id ? { ...account, server: 'Manager Station' } : account));
    } catch (error) {
      setConnectionError(error.message);
    }
  };

  if (isFirstLaunch) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0c10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(24, 25, 33, 0.75)', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '8px', color: '#00ff66' }}>MerchantGo</h1>
          <p style={{ color: '#9496a3', marginBottom: '32px' }}>Desktop Enterprise KDS & Register</p>
          {connectionError && <p style={{ color: '#ff8585', marginBottom: '16px' }}>{connectionError}</p>}
          
          {!isSettingUpOffline ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="email" placeholder="Owner email" value={email} onChange={event => setEmail(event.target.value)} style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <input type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 700 }} onClick={connectAccount}>
                Sign In to MerchantGo
              </button>
              <div style={{ fontSize: '0.75rem', color: '#9496a3' }}>or use a configured paid staff station PIN</div>
              <input type="password" inputMode="numeric" placeholder="Staff PIN" value={cloudPin} onChange={event => setCloudPin(event.target.value)} style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} onClick={connectCloudStation}>
                Connect Cloud Station
              </button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsSettingUpOffline(true)}>
                Continue Offline (Local Database)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Create Local Admin</h2>
              <input type="text" placeholder="Admin Name (e.g. Boss)" value={localAdminName} onChange={e => setLocalAdminName(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <select value={localMode} onChange={event => setLocalMode(event.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#14171e', color: '#fff' }}>
                <option value="SOLO_FOOD_TRUCK">Solo Food Truck</option>
                <option value="MULTI_STATION_BAR">Multi-station Restaurant / Bar</option>
              </select>
              <input type="password" inputMode="numeric" placeholder="4 digit staff PIN" value={localAdminPin} onChange={event => setLocalAdminPin(event.target.value.replace(/\D/g, '').slice(0, 4))} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }} onClick={async () => {
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

  if (!session && hasLocalRegister()) {
    return <LocalPinGate onAuthenticate={setSession} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* TERMINAL HEADER */}
      <header style={{ borderBottom: '1px solid var(--border-glass)', padding: '16px 24px', backgroundColor: 'rgba(12,13,18,0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6b00, #993d00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 4px 15px rgba(255, 107, 0, 0.4)' }}>
            D
          </div>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'Outfit', display: 'block' }}>
              MERCHANT<span style={{ color: '#ff6b00' }}>GO</span> <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255, 107, 0, 0.15)', color: '#ff6b00', padding: '3px 8px', borderRadius: '6px' }}>ELECTRON DESKTOP POS</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Console User: <strong>{session?.name} ({session?.role})</strong> • Plan: <strong>{session?.plan}</strong></span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setActiveTab('accounts')} className={activeTab === 'accounts' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            Active Floor Accounts ({accounts.length})
          </button>
          <button onClick={() => setActiveTab('cashdrawer')} className={activeTab === 'cashdrawer' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            Cash Drawer & Float
          </button>
          <button onClick={() => setActiveTab('zreport')} className={activeTab === 'zreport' ? 'btn-pos' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: '0.9rem', backgroundColor: activeTab === 'zreport' ? '#00ff66' : '', color: activeTab === 'zreport' ? '#000' : '' }}>
            El Corte de Caja (Z-Report)
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '12px' }}>
          {session?.offline && (
            <button onClick={() => setShiftModalOpen(true)} className="btn-secondary" style={{ padding: '8px 14px', color: localShift ? '#00ff66' : '#ffb800' }}>
              {localShift ? `✓ Shift: ${localShift.staffName}` : 'Start staff shift'}
            </button>
          )}
          <button onClick={() => setSession(null)} className="btn-secondary" style={{ padding: '8px 14px' }}>🔒 Lock</button>
          <button onClick={() => handleOpenDrawer()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#ff6b00', borderColor: '#ff6b00' }}>
            🔓 Open Drawer
          </button>
          <button onClick={() => handlePrintTicket()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <Printer size={16} /> Preview Receipt
          </button>
        </div>
      </header>

      {/* STATUS BANNER */}
      {(printerStatus || drawerOpen) && (
        <div style={{ backgroundColor: drawerOpen ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 107, 0, 0.2)', borderBottom: '1px solid #fff', padding: '12px 24px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: drawerOpen ? '#00ff66' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {drawerOpen ? '🔓 CASH DRAWER UNLOCKED & TILL ACCESSED' : printerStatus}
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <main style={{ flex: 1, padding: '40px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        
        {/* TAB 1: ACCOUNTS SETTLEMENT */}
        {activeTab === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '6px' }}>Table Account Settlement Console</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                  Select an account initiated via waitstaff shared PIN tablets to process cash or card terminal checkouts.
                </p>
              </div>
              <span style={{ fontSize: '0.9rem', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: '#00ff66', fontWeight: 700 }}>
                ● Real-Time WebSocket Listener Active
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '26px' }}>
              {accounts.map((acc) => (
                <div key={acc.id} className="glass-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: acc.status === 'READY_TO_PAY' ? '4px solid #00ff66' : '4px solid #ff6b00' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', padding: '4px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', fontFamily: 'Outfit' }}>
                        {acc.id}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: acc.status === 'READY_TO_PAY' ? '#00ff66' : '#ff6b00' }}>
                        {acc.status} • {acc.time}
                      </span>
                    </div>

                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                      Assigned Waitstaff: <strong style={{ color: '#fff' }}>{acc.server}</strong>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '12px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Line Item Orders</span>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.92rem', color: '#ddd' }}>
                        {acc.items.map((i, idx) => (
                          <li key={idx} onClick={() => setActiveDesktopMod({ accId: acc.id, itemIdx: idx, itemName: i })} style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between' }}>
                            <span>▪ {i}</span>
                            <span style={{ fontSize: '0.75rem', color: '#00ff66', fontWeight: 800, padding: '2px 8px', background: 'rgba(0,255,102,0.1)', borderRadius: '4px' }}>+ MOD</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Amount Due:</span>
                      <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>${acc.total.toFixed(2)}</span>
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
            </div>
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
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>Current Cash Float</span>
                <strong style={{ fontSize: '2.4rem', color: '#00ff66', fontFamily: 'Outfit' }}>$4,120.50 MXN</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>Drawer Lock State</span>
                <strong style={{ fontSize: '2rem', color: drawerOpen ? '#00ff66' : '#ff6b00', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span style={{ fontSize: '0.8rem', color: '#00ff66', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(0, 255, 102, 0.15)', padding: '4px 14px', borderRadius: '999px', display: 'inline-block', marginBottom: '14px' }}>
                Shift Cashout & Digital Audit Exporting
              </span>
              <h1 style={{ fontSize: '3rem', marginBottom: '12px' }}>El Corte de Caja (Z-Report)</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
                Compile settled shift revenue, separate cash vs. card balances, and calculate waiter tip pools from authenticated MerchantGo orders.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '26px', marginBottom: '40px' }}>
              <div className="glass-box" style={{ borderTop: '4px solid #ff6b00', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

              <div className="glass-box" style={{ borderTop: '4px solid #00ff66', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
              <div className="glass-box" style={{ border: '2px solid #00ff66', background: 'rgba(10, 26, 18, 0.9)', padding: '36px', animation: 'fadeIn 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '18px', marginBottom: '22px' }}>
                  <div>
                    <span style={{ color: '#00ff66', fontWeight: 800, fontSize: '0.85rem', display: 'block' }}>✔ Z-REPORT TICKET #{lastZReport.id} GENERATED</span>
                    <h3 style={{ fontSize: '1.8rem' }}>{lastZReport.type}</h3>
                  </div>
                  <button onClick={() => handlePrintTicket(lastZReport)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#00ff66', color: '#000', fontWeight: 800 }}>
                    <Printer size={16} /> Export Audit PDF Ticket
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Gross Revenue</span>
                    <strong style={{ fontSize: '1.5rem', color: '#fff' }}>{lastZReport.gross_sales}</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Cash Collected</span>
                    <strong style={{ fontSize: '1.5rem', color: '#00ff66' }}>{lastZReport.cash_collected}</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Card Terminal</span>
                    <strong style={{ fontSize: '1.5rem', color: '#fff' }}>{lastZReport.card_settled}</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Staff Tips Pool</span>
                    <strong style={{ fontSize: '1.5rem', color: '#ffb800' }}>{lastZReport.waiter_tips_pool}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <span>Timestamp: <strong>{lastZReport.time}</strong></span>
                  <span style={{ color: '#00ff66', fontWeight: 700 }}>● {lastZReport.status}</span>
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
            updated[accIndex].items[activeDesktopMod.itemIdx] = newString;
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
            }} placeholder="Staff PIN" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,.4)', color: '#fff', marginBottom: '12px' }} />}
            {shiftError && <p style={{ color: '#ff8585', marginBottom: '12px' }}>{shiftError}</p>}
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
    </div>
  );
}
