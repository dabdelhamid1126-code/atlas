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

const inp = { background: 'var(--parch-warm)', color: 'var(--ink)', borderColor: 'var(--parch-line)' };
const lbl = { fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-dim)', display: 'block', marginBottom: 6 };

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
    <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      {/* Main filter row */}
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--ink-ghost)', pointerEvents: 'none' }} />
          <Input
            type="text"
            placeholder="Search products, stores..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ ...inp, paddingLeft: 34 }}
            className="text-sm"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, minWidth: 0 }}>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="text-sm" style={{ ...inp, minWidth: 130 }}>
              <SelectValue placeholder="All Statuses">{statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={vendorFilter} onValueChange={onVendorChange}>
            <SelectTrigger className="text-sm" style={{ ...inp, minWidth: 130 }}>
              <SelectValue placeholder="All Vendors">{vendorFilter === 'all' ? 'All Vendors' : vendorFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={onAccountChange}>
            <SelectTrigger className="text-sm" style={{ ...inp, minWidth: 130 }}>
              <SelectValue placeholder="All Platforms">{accountFilter === 'all' ? 'All Platforms' : accountFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
            ...(expanded
              ? { background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold)' }
              : { background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)' })
          }}
        >
          <Filter style={{ width: 14, height: 14 }} />
          More Filters
        </button>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--parch-line)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} style={inp} className="text-sm" />
          </div>
          <div>
            <label style={lbl}>To Date</label>
            <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} style={inp} className="text-sm" />
          </div>
          <div>
            <label style={lbl}>Payment Method</label>
            <Select value={paymentMethodFilter} onValueChange={onPaymentMethodChange}>
              <SelectTrigger className="text-sm" style={inp}>
                <SelectValue placeholder="All Cards">{paymentMethodFilter === 'all' ? 'All Cards' : (creditCards.find(c => c.id === paymentMethodFilter)?.card_name || paymentMethodFilter)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards</SelectItem>
                {creditCards.map(card => (
                  <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={lbl}>Category</label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="text-sm" style={inp}>
                <SelectValue placeholder="All Categories">{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}