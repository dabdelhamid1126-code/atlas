import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  // Inventory statuses
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  received: 'bg-gray-200 text-gray-800 border-gray-400',
  in_stock: 'bg-black text-white border-black',
  reserved: 'bg-gray-600 text-white border-gray-600',
  exported: 'bg-gray-300 text-gray-700 border-gray-400',
  damaged: 'bg-gray-900 text-white border-gray-900',
  
  // Order statuses
  ordered: 'bg-gray-200 text-gray-800 border-gray-400',
  shipped: 'bg-gray-400 text-white border-gray-400',
  partially_received: 'bg-gray-100 text-gray-700 border-gray-300',
  cancelled: 'bg-gray-200 text-gray-500 border-gray-300',
  
  // Export statuses
  processing: 'bg-gray-300 text-gray-800 border-gray-400',
  completed: 'bg-black text-white border-black',
  
  // Invoice statuses
  draft: 'bg-gray-100 text-gray-600 border-gray-300',
  sent: 'bg-gray-300 text-gray-800 border-gray-400',
  paid: 'bg-black text-white border-black',
  overdue: 'bg-gray-800 text-white border-gray-800',
  
  // Task statuses
  in_progress: 'bg-gray-300 text-gray-800 border-gray-400',
  
  // Gift card statuses
  available: 'bg-black text-white border-black',
  used: 'bg-gray-200 text-gray-500 border-gray-300',
  invalid: 'bg-gray-800 text-white border-gray-800',
  
  // Approval statuses
  approved: 'bg-black text-white border-black',
  rejected: 'bg-gray-800 text-white border-gray-800',
  
  // Priority
  low: 'bg-gray-100 text-gray-600 border-gray-300',
  medium: 'bg-gray-300 text-gray-800 border-gray-400',
  high: 'bg-gray-600 text-white border-gray-600',
  urgent: 'bg-black text-white border-black',
  
  // Damage types
  physical: 'bg-red-100 text-red-800 border-red-300',
  water: 'bg-blue-100 text-blue-800 border-blue-300',
  defective: 'bg-red-200 text-red-900 border-red-400',
  missing_parts: 'bg-orange-100 text-orange-800 border-orange-300',
  other: 'bg-gray-100 text-gray-600 border-gray-300',
  
  // Categories (for products)
  phones: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  tablets: 'bg-purple-100 text-purple-800 border-purple-300',
  laptops: 'bg-blue-100 text-blue-800 border-blue-300',
  gaming: 'bg-red-100 text-red-800 border-red-300',
  accessories: 'bg-green-100 text-green-800 border-green-300',
  wearables: 'bg-pink-100 text-pink-800 border-pink-300',
  audio: 'bg-orange-100 text-orange-800 border-orange-300',
  
  // Default
  default: 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function StatusBadge({ status, className }) {
  const formattedStatus = status?.replace(/_/g, ' ');
  const style = statusStyles[status] || statusStyles.default;
  
  return (
    <Badge 
      variant="outline" 
      className={cn("capitalize font-medium border", style, className)}
    >
      {formattedStatus}
    </Badge>
  );
}