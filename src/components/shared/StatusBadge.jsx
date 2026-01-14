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
  physical: 'bg-orange-50 text-orange-700 border-orange-200',
  water: 'bg-blue-50 text-blue-700 border-blue-200',
  defective: 'bg-red-50 text-red-700 border-red-200',
  missing_parts: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
  
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