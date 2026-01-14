import React from 'react';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmptyState({ 
  icon: Icon = Package, 
  title = "No data found", 
  description,
  actionLabel,
  onAction 
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}