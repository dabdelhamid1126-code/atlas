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
  const [activeTab, setActiveTab] = useState('goals');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your account preferences</p>
        <nav className="space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-secondary border border-purple-500/50 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
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
            <h2 className="text-lg font-bold text-foreground mb-1">Profile</h2>
            <p className="text-sm text-muted-foreground mb-4">Your account info.</p>
            {user && (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p><p className="text-foreground font-medium">{user.full_name || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p><p className="text-foreground font-medium">{user.email || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Role</p><p className="text-foreground font-medium capitalize">{user.role || 'user'}</p></div>
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