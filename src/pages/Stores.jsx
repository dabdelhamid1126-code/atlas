import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import VendorsTab from '@/components/stores/VendorsTab';
import AccountsTab from '@/components/stores/AccountsTab';
import BuyersTab from '@/components/stores/BuyersTab';

const TABS = ['Vendors', 'Accounts', 'Buyers'];

export default function Stores() {
  const [activeTab, setActiveTab] = useState('Vendors');

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: buyers = [] } = useQuery({ queryKey: ['buyers'], queryFn: () => base44.entities.Buyer.list() });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Vendors, Accounts & Buyers</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage where you buy from, your accounts, and where you sell to</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-violet-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
            {tab === 'Vendors' && vendors.length > 0 && <span className="ml-1.5 text-xs opacity-70">({vendors.length})</span>}
            {tab === 'Accounts' && accounts.length > 0 && <span className="ml-1.5 text-xs opacity-70">({accounts.length})</span>}
            {tab === 'Buyers' && buyers.length > 0 && <span className="ml-1.5 text-xs opacity-70">({buyers.length})</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Vendors' && <VendorsTab vendors={vendors} />}
      {activeTab === 'Accounts' && <AccountsTab accounts={accounts} vendors={vendors} />}
      {activeTab === 'Buyers' && <BuyersTab buyers={buyers} />}
    </div>
  );
}