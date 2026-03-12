import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];

export default function POFilters({
  search,
  setSearch,
  retailerFilter,
  setRetailerFilter,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  orders
}) {
  const retailers = [...new Set(orders.map(o => o.retailer).filter(Boolean))].sort();

  return (
    <div className="space-y-4 mb-6">
      {/* Search and buttons row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products, stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-50"
          />
        </div>
      </div>

      {/* 2x2 Grid of filters */}
      <div className="grid grid-cols-2 gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={retailerFilter} onValueChange={setRetailerFilter}>
          <SelectTrigger className="bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {retailers.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="dropship">Dropship</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
            <SelectItem value="shipping">Shipping</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order-date-new">Newest First</SelectItem>
            <SelectItem value="order-date-old">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name: A to Z</SelectItem>
            <SelectItem value="name-desc">Name: Z to A</SelectItem>
            <SelectItem value="total-high">Total: High to Low</SelectItem>
            <SelectItem value="total-low">Total: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* More Filters */}
      <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
        <Filter className="h-4 w-4" /> More Filters
      </button>
    </div>
  );
}