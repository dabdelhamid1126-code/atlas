import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

export default function TransactionsFilters({
  vendors = [],
  platforms = [],
  creditCards = [],
  onFilterChange,
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [vendor, setVendor] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');

  const handleFilterChange = () => {
    onFilterChange({
      search,
      status,
      vendor,
      platform,
      fromDate,
      toDate,
      paymentMethod,
      category,
      account,
    });
  };

  const uniquePlatforms = useMemo(() => {
    const set = new Set(platforms.filter(Boolean));
    return Array.from(set).sort();
  }, [platforms]);

  const categories = ['dining', 'travel', 'groceries', 'gas', 'streaming', 'other'];
  const accounts = ['all']; // Can be expanded with actual accounts

  const handleSearch = (value) => {
    setSearch(value);
    // Debounce or call directly
  };

  const handleStatusChange = (value) => {
    setStatus(value);
  };

  const handleVendorChange = (value) => {
    setVendor(value);
  };

  const handlePlatformChange = (value) => {
    setPlatform(value);
  };

  React.useEffect(() => {
    handleFilterChange();
  }, [search, status, vendor, platform, fromDate, toDate, paymentMethod, category, account]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4 mb-6">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products, stores..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-gray-100 border-0 rounded-full placeholder-gray-400 text-gray-700"
          />
        </div>

        {/* Status */}
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="purchased">Purchased</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Vendor */}
        <Select value={vendor} onValueChange={handleVendorChange}>
          <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform */}
        <Select value={platform} onValueChange={handlePlatformChange}>
          <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {uniquePlatforms.map(p => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
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
        {expanded ? 'Less Filters' : 'More Filters'}
      </button>

      {/* Expanded Filters */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-gray-200">
          {/* Row 1: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-gray-100 border-0 rounded-full text-gray-700"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-gray-100 border-0 rounded-full text-gray-700"
              />
            </div>
          </div>

          {/* Row 2: Payment & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  {creditCards.map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.card_name} ({card.id?.slice(-4) || 'XXXX'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-2">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-gray-100 border-0 rounded-full text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Account */}
          <div className="w-1/2">
            <label className="text-xs uppercase text-gray-500 block mb-2">Account</label>
            <Select value={account} onValueChange={setAccount}>
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