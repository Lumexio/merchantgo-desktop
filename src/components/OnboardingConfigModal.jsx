import React, { useEffect, useState } from 'react';

export default function OnboardingConfigModal({ session }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session || session.offline) return;
    
    const isFreePlan = session.plan === 'FREE';
    const role = session.role?.toUpperCase() || '';
    const hasPrivilege = ['OWNER', 'ADMIN'].includes(role);
    
    if (!isFreePlan || !hasPrivilege) return;

    const pref = localStorage.getItem('merchantgo.storage_preference');
    if (!pref) {
      setVisible(true);
    }
  }, [session]);

  const selectStorage = (type) => {
    localStorage.setItem('merchantgo.storage_preference', type);
    setVisible(false);
    if (type === 'gdrive') {
      alert('Google Drive sync is managed via the Web Dashboard. Please authorize there to perform cloud sync operations.');
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 9999, backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        backgroundColor: '#141822',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '24px', marginRight: '12px' }}>☁️</span>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: 0 }}>Data Sync Configuration</h2>
        </div>
        
        <p style={{ color: '#9496a3', marginBottom: '32px', fontSize: '1.05rem', lineHeight: 1.6 }}>
          As a free user, you can choose where to securely sync your catalog across devices:
        </p>

        <div
          onClick={() => selectStorage('server')}
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.03)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ marginRight: '8px' }}>🏢</span>
            <strong style={{ fontSize: '1.1rem', color: '#fff' }}>Comet Server</strong>
          </div>
          <p style={{ margin: 0, color: '#9496a3', fontSize: '0.95rem' }}>
            Data is stored on our managed servers. Strict freemium storage limits apply.
          </p>
        </div>

        <div
          onClick={() => selectStorage('gdrive')}
          style={{
            border: '2px solid #00ff66',
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            background: 'rgba(0,255,102,0.05)',
            boxShadow: '0 0 20px rgba(0,255,102,0.15)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,255,102,0.1)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,102,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,255,102,0.05)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,102,0.15)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ marginRight: '8px' }}>📁</span>
            <strong style={{ fontSize: '1.1rem', color: '#00ff66' }}>Google Drive</strong>
          </div>
          <p style={{ margin: 0, color: '#9496a3', fontSize: '0.95rem' }}>
            Sync to your personal Drive. <strong style={{ color: '#00ff66' }}>Unlimited capacity.</strong> (Recommended)
          </p>
        </div>
      </div>
    </div>
  );
}
