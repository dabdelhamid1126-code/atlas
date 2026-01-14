import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  // Inventory statuses
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  in_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reserved: 'bg-purple-50 text-purple-700 border-purple-200',
  exported: 'bg-slate-100 text-slate-600 border-slate-200',
  damaged: 'bg-red-50 text-red-700 border-red-200',
  
  // Order statuses
  ordered: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  partially_received: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  
  // Export statuses
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  
  // Invoice statuses
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  
  // Task statuses
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  
  // Gift card statuses
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  used: 'bg-slate-100 text-slate-500 border-slate-200',
  invalid: 'bg-red-50 text-red-700 border-red-200',
  
  // Approval statuses
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  
  // Priority
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
  
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