import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, Target, Database, Palette } from 'lucide-react';
import GoalsTab from '@/components/settings/GoalsTab';
import DataTab from '@/components/settings/DataTab';
import AppearanceTab from '@/components/settings/AppearanceTab';

const tabs = [
  { key: 'profile',    label: 'Profile',    icon: User },
  { key: 'goals',      label: 'Goals',      icon: Target },
  { key: 'data',       label: 'Data',       icon: Database },
  { key: 'appearance', label: 'Appearance', icon: Palette },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Manage your account preferences</p>
        <nav className="space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: isActive ? `1px solid var(--accent-primary)` : 'none'
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Profile</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Your account info.</p>
            {user && (
              <div className="rounded-2xl p-6 space-y-3" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
                <div><p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Name</p><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.full_name || '—'}</p></div>
                <div><p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Email</p><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.email || '—'}</p></div>
                <div><p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Role</p><p className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{user.role || 'user'}</p></div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'goals' && <GoalsTab user={user} />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
      </div>
    </div>
  );
}