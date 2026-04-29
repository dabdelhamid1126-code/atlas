import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function NamePromptModal({ onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name.');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: `${firstName.trim()} ${lastName.trim()}` });
      onComplete(`${firstName.trim()} ${lastName.trim()}`);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
    border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)',
    color: '#f0d070', fontSize: 14, outline: 'none', fontFamily: 'var(--font-sans)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 20 }}>
      <div style={{ background: '#1e1a14', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#f0d070', fontFamily: 'var(--font-serif)', margin: '0 0 8px' }}>Welcome to Atlas</p>
          <p style={{ fontSize: 13, color: 'rgba(201,168,76,0.7)', margin: 0 }}>Please enter your name to get started.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', display: 'block', marginBottom: 4 }}>First Name</label>
            <input
              value={firstName}
              onChange={e => { setFirstName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="John"
              autoFocus
              style={inp}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', display: 'block', marginBottom: 4 }}>Last Name</label>
            <input
              value={lastName}
              onChange={e => { setLastName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Doe"
              style={inp}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: '#fca5a5', margin: 0 }}>{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: 8, height: 44, borderRadius: 10, background: saving ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg,#c9a84c,#f5e09a)', border: 'none', color: '#1e1a14', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-serif)' }}
          >
            {saving ? 'Saving...' : 'Get Started →'}
          </button>
        </div>
      </div>
    </div>
  );
}