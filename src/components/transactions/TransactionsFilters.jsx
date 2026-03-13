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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      {/* Main filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search products, stores..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm rounded-lg"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-36 bg-slate-50 border-slate-200 text-sm rounded-lg">
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
          <SelectTrigger className="w-36 bg-slate-50 border-slate-200 text-sm rounded-lg">
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
          <SelectTrigger className="w-36 bg-slate-50 border-slate-200 text-sm rounded-lg">
            <SelectValue placeholder="All Platforms">{accountFilter === 'all' ? 'All Platforms' : accountFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
            expanded ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <Filter className="h-4 w-4" />
          More Filters
        </button>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)}
              className="bg-slate-50 border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)}
              className="bg-slate-50 border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Payment Method</label>
            <Select value={paymentMethodFilter} onValueChange={onPaymentMethodChange}>
              <SelectTrigger className="bg-slate-50 border-slate-200 text-sm">
                <SelectValue placeholder="All Payment Methods">{paymentMethodFilter === 'all' ? 'All Payment Methods' : (creditCards.find(c => c.id === paymentMethodFilter)?.card_name || paymentMethodFilter)}</SelectValue>
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
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="bg-slate-50 border-slate-200 text-sm">
                <SelectValue placeholder="All Categories">{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}