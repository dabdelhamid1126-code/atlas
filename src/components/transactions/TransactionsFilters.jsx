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
const CATEGORIES = ['dining', 'travel', 'groceries', 'gas', 'streaming', 'other'];

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
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-4">
      {/* Row 1: Search + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products, stores..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-100 border-0 rounded-full placeholder-gray-400 text-gray-700 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Vendor */}
      <div className="grid grid-cols-2 gap-4">
        <Select value={vendorFilter} onValueChange={onVendorChange}>
          <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* More Filters Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium transition"
      >
        <Filter className="h-4 w-4" />
        {expanded ? '▲ Less Filters' : '▼ More Filters'}
      </button>

      {/* Expanded Section */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-gray-200">
          {/* Row 3: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2 font-semibold">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="bg-gray-100 border-0 rounded-full text-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2 font-semibold">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="bg-gray-100 border-0 rounded-full text-gray-700 text-sm"
              />
            </div>
          </div>

          {/* Row 4: Payment + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2 font-semibold">Payment Method</label>
              <Select value={paymentMethodFilter} onValueChange={onPaymentMethodChange}>
                <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  {creditCards.map(card => {
                    const lastFour = card.id?.slice(-4) || 'XXXX';
                    let rewardDisplay = '';
                    if (card.reward_type === 'cashback' && card.cashback_rate) {
                      rewardDisplay = `${card.cashback_rate}%`;
                    } else if (card.reward_type === 'points' && card.points_rate) {
                      rewardDisplay = `${card.points_rate}x pts`;
                    } else if (card.reward_type === 'both') {
                      if (card.cashback_rate) rewardDisplay = `${card.cashback_rate}%`;
                      else if (card.points_rate) rewardDisplay = `${card.points_rate}x pts`;
                    }
                    return (
                      <SelectItem key={card.id} value={card.id}>
                        {card.card_name} ({lastFour}){rewardDisplay ? ` - ${rewardDisplay}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2 font-semibold">Category</label>
              <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
                  <SelectValue />
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

          {/* Row 5: Account */}
          <div className="w-1/2">
            <label className="text-xs uppercase text-gray-500 block mb-2 font-semibold">Account</label>
            <Select value={accountFilter} onValueChange={onAccountChange}>
              <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}