import React, { useState } from 'react';

export default function RegisterView({ menuItems, session, onSettle }) {
  const [cart, setCart] = useState([]);
  const [cashTendered, setCashTendered] = useState(null);
  
  // ponytail: minimal unabstracted local storage for terminal
  const [terminalProvider, setTerminalProvider] = useState(localStorage.getItem('terminal_provider') || 'NONE');
  const [terminalId, setTerminalId] = useState(localStorage.getItem('terminal_id') || '');

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0);

  const handlePay = (method) => {
    // ponytail: simple callback mapping to desktop's local/cloud API.
    onSettle({ items: cart, total: cartTotal, method });
    setCart([]);
    setCashTendered(null);
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      {/* Menu Area */}
      <div style={{ flex: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', alignContent: 'start' }}>
        {menuItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => addToCart(item)}
            className="glass-box" 
            style={{ padding: '20px', cursor: 'pointer', borderTop: '3px solid var(--primary)', transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ fontWeight: 800, marginBottom: '8px' }}>{item.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>{item.category}</div>
            <div style={{ color: 'var(--accent-success)', fontWeight: 800 }}>${Number(item.price).toFixed(2)}</div>
          </div>
        ))}
        {menuItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Menu is empty. Add items in the Menu tab first.
          </div>
        )}
      </div>

      {/* Cart Area */}
      <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '16px' }}>Current Order</h2>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <span>{item.qty}x {item.name}</span>
              <strong>${(Number(item.price) * item.qty).toFixed(2)}</strong>
            </div>
          ))}
          {cart.length === 0 && <div style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Cart is empty. Tap items to add.</div>}
        </div>
        
        <div style={{ padding: '20px', background: 'var(--bg-input)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>
            <span>Total:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
             {[20, 50, 100].map(amt => (
               <button 
                 key={amt} 
                 onClick={() => setCashTendered(amt)}
                 style={{ padding: '10px', background: cashTendered === amt ? '#00cc52' : 'var(--glass-overlay)', color: cashTendered === amt ? '#000' : 'var(--text-main)', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
               >
                 ${amt}
               </button>
             ))}
          </div>
          {cashTendered !== null && cashTendered >= cartTotal && (
             <div style={{ color: 'var(--accent-success)', marginBottom: '16px', fontWeight: 700 }}>
               Change Due: ${(cashTendered - cartTotal).toFixed(2)}
             </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button disabled={cart.length === 0} onClick={() => handlePay('CASH')} className="btn-staff" style={{ flex: 1, background: '#00cc52', color: '#000', padding: '14px', opacity: cart.length === 0 ? 0.5 : 1 }}>
              💵 Cash Pay
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button disabled={cart.length === 0} onClick={async () => {
                if (terminalProvider === 'MERCADOPAGO') {
                  try {
                    await fetch(`https://api.mercadopago.com/point/integration-api/devices/${terminalId}/payment-intents`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${localStorage.getItem('mp_token') || 'TEST_TOKEN'}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ amount: cartTotal, description: "MerchantGo Order" })
                    });
                  } catch (e) { alert("MP Point API Error: " + e.message); return; }
                } else if (terminalProvider === 'CLIP') {
                  try {
                    await fetch(`https://api.clip.mx/v1/payment-requests`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${localStorage.getItem('clip_token') || 'TEST_TOKEN'}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ amount: cartTotal, reference: "MerchantGo" })
                    });
                  } catch (e) { alert("Clip API Error: " + e.message); return; }
                }
                handlePay('CARD');
              }} className="btn-staff" style={{ background: '#635bff', padding: '14px', opacity: cart.length === 0 ? 0.5 : 1 }}>
                💳 Card ({terminalProvider === 'NONE' ? 'Manual' : terminalProvider})
              </button>
              <select value={terminalProvider} onChange={e => { setTerminalProvider(e.target.value); localStorage.setItem('terminal_provider', e.target.value); }} style={{ padding: '6px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '0.75rem' }}>
                <option value="NONE">💡 Connect a Terminal...</option>
                <option value="CLIP">Clip Terminal</option>
                <option value="MERCADOPAGO">MercadoPago Point</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
