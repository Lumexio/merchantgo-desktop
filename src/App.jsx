import React, { useState, useEffect } from 'react';
import { Printer, DollarSign, Users, Lock, RefreshCw, Layers, CheckCircle2, AlertCircle, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'cashdrawer' | 'zreport'
  const [printerStatus, setPrinterStatus] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastZReport, setLastZReport] = useState(null);

  const [accounts, setAccounts] = useState([
    { id: 'TBL-12', server: 'Server PIN #08', total: 114.20, time: '8m ago', status: 'READY_TO_PAY', items: ['Tomahawk Steak', 'Cabernet Sauvignon x2', 'Truffle Fries'] },
    { id: 'BAR-03', server: 'Bartender PIN #01', total: 46.00, time: '22m ago', status: 'OPEN', items: ['Añejo Margarita x3', 'Craft Beer Pint'] },
    { id: 'PATIO-05', server: 'Server PIN #14', total: 89.50, time: '34m ago', status: 'READY_TO_PAY', items: ['Ribeye Tacos x4', 'Guacamole Bowl', 'Agave Cocktail'] }
  ]);

  useEffect(() => {
    // Listen to simulated Electron IPC signals if inside desktop executable
    if (window.merchantGoIPC) {
      window.merchantGoIPC.on('print-ticket-status', (msg) => {
        setPrinterStatus(msg.message);
        setTimeout(() => setPrinterStatus(null), 5000);
      });
      window.merchantGoIPC.on('drawer-status', (msg) => {
        setDrawerOpen(true);
        setTimeout(() => setDrawerOpen(false), 8000);
      });
    }
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

  const executeCorte = (type) => {
    const sum = accounts.reduce((acc, a) => acc + a.total, 0);
    const report = {
      id: `Z-${Math.floor(1000 + Math.random() * 9000)}`,
      type,
      time: new Date().toLocaleTimeString() + ' • ' + new Date().toLocaleDateString(),
      gross_sales: `$${(sum + 4120.50).toFixed(2)}`,
      cash_collected: `$${((sum + 4120.50) * 0.42).toFixed(2)}`,
      card_settled: `$${((sum + 4120.50) * 0.58).toFixed(2)}`,
      waiter_tips_pool: `$${((sum + 4120.50) * 0.15).toFixed(2)}`,
      status: 'SHIFT CLOSED & STOCKMACHINE ARCHIVES SYNCED'
    };
    setLastZReport(report);
    handlePrintTicket(report);
  };

  const settleAccount = (id, method) => {
    setAccounts(accounts.filter(x => x.id !== id));
    handleOpenDrawer();
  };

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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Console User: <strong>Lead Cashier (Station #1)</strong> • Sync Interface: <strong style={{ color: '#00ff66' }}>CONNECTED (Cloud WebSocket)</strong></span>
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
                          <li key={idx}>▪ {i}</li>
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
                      <button onClick={() => settleAccount(acc.id, 'CASH')} className="btn-pos" style={{ padding: '14px', fontSize: '0.95rem', background: '#00cc52', color: '#000' }}>
                        💵 Cash Settle
                      </button>
                      <button onClick={() => settleAccount(acc.id, 'CARD')} className="btn-pos" style={{ padding: '14px', fontSize: '0.95rem' }}>
                        💳 Card Terminal
                      </button>
                    </div>
                    <button onClick={() => alert(`Transferred ${acc.id} to Manager Station Override.`)} className="btn-secondary" style={{ width: '100%', marginTop: '10px', fontSize: '0.8rem', padding: '10px' }}>
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
              Manage active cash register float balances and verify digital session security status via real-time cloud TypeORM tracking.
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
                Compile shift gross revenue, separate cash vs. card payment terminal balances, and calculate waiter tips pools. Automatically generates official digital audit tickets and syncs with cloud TypeORM archives.
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
                <button onClick={() => executeCorte('General Shift Cashout (El Corte General)')} className="btn-pos" style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}>
                  Execute General Corte →
                </button>
              </div>

              <div className="glass-box" style={{ borderTop: '4px solid #00ff66', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Individual Server Cashout</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
                    Reconciles assigned accounts for a single waiter or bartender concluding their shift early without interrupting general bar operations.
                  </p>
                </div>
                <button onClick={() => executeCorte('Individual Waiter Reconcile (Server PIN #08)')} className="btn-pos" style={{ width: '100%', padding: '14px', fontSize: '1.05rem', background: '#00cc52', color: '#000' }}>
                  Execute Server Reconcile →
                </button>
              </div>
            </div>

            {/* Generated Ticket output */}
            {lastZReport && (
              <div className="glass-box" style={{ border: '2px solid #00ff66', background: 'rgba(10, 26, 18, 0.9)', padding: '36px', animation: 'fadeIn 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '18px', marginBottom: '22px' }}>
                  <div>
                    <span style={{ color: '#00ff66', fontWeight: 800, fontSize: '0.85rem', display: 'block' }}>✔ Z-REPORT TICKET #{lastZReport.id} EXPORTED TO CLOUD ARCHIVES</span>
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
        © 2026 MerchantGo Electron Desktop Terminal • Comet Pocket Machinery Monorepo • All Row-Level Security Rules Active
      </footer>
    </div>
  );
}
