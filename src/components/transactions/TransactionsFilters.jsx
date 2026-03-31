import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

const inp = { background: 'rgba(255,255,255,0.04)', color: 'white', borderColor: 'rgba(255,255,255,0.1)' };

const STATUSES = ['pending', 'ordered', 'shipped', 'delivered', 'received', 'cancelled'];
const CATEGORIES = ['Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty', 'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other'];

export default function TransactionsFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  vendorFilter,
  onVendorChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  paymentMethodFilter,
  onPaymentMethodChange,
  categoryFilter,
  onCategoryChange,
  accountFilter,
  onAccountChange,
  vendors = [],
  creditCards = [],
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      {/* Main filter row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569', pointerEvents: 'none' }} />
          <Input
            type="text"
            placeholder="Search products, stores..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ ...inp, paddingLeft: 34 }}
            className="text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-36 text-sm text-slate-300" style={inp}>
            <SelectValue placeholder="All Statuses">{statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</SelectValue>
          </SelectTrigger>
          <SelectContent style={{ background: '#1a2234' }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s} style={{ color: '#e2e8f0' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={vendorFilter} onValueChange={onVendorChange}>
          <SelectTrigger className="w-36 text-sm text-slate-300" style={inp}>
            <SelectValue placeholder="All Vendors">{vendorFilter === 'all' ? 'All Vendors' : vendorFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent style={{ background: '#1a2234' }}>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v} value={v} style={{ color: '#e2e8f0' }}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={onAccountChange}>
          <SelectTrigger className="w-36 text-sm text-slate-300" style={inp}>
            <SelectValue placeholder="All Platforms">{accountFilter === 'all' ? 'All Platforms' : accountFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent style={{ background: '#1a2234' }}>
            <SelectItem value="all">All Platforms</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
            ...(expanded
              ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' })
          }}
        >
          <Filter style={{ width: 14, height: 14 }} />
          More Filters
        </button>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} style={inp} className="text-sm text-slate-300" />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>To Date</label>
            <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} style={inp} className="text-sm text-slate-300" />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>Payment Method</label>
            <Select value={paymentMethodFilter} onValueChange={onPaymentMethodChange}>
              <SelectTrigger className="text-sm text-slate-300" style={inp}>
                <SelectValue placeholder="All Cards">{paymentMethodFilter === 'all' ? 'All Cards' : (creditCards.find(c => c.id === paymentMethodFilter)?.card_name || paymentMethodFilter)}</SelectValue>
              </SelectTrigger>
              <SelectContent style={{ background: '#1a2234' }}>
                <SelectItem value="all">All Cards</SelectItem>
                {creditCards.map(card => (
                  <SelectItem key={card.id} value={card.id} style={{ color: '#e2e8f0' }}>{card.card_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>Category</label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="text-sm text-slate-300" style={inp}>
                <SelectValue placeholder="All Categories">{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent style={{ background: '#1a2234' }}>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} style={{ color: '#e2e8f0' }}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}