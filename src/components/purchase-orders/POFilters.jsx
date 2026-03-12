import React from 'react';
import { Search } from 'lucide-react';
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
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={retailerFilter} onValueChange={setRetailerFilter}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Retailers</SelectItem>
          {retailers.map(r => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-40">
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
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="order-date-new">Date: New to Old</SelectItem>
          <SelectItem value="order-date-old">Date: Old to New</SelectItem>
          <SelectItem value="name-asc">Name: A to Z</SelectItem>
          <SelectItem value="name-desc">Name: Z to A</SelectItem>
          <SelectItem value="total-high">Total: High to Low</SelectItem>
          <SelectItem value="total-low">Total: Low to High</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}