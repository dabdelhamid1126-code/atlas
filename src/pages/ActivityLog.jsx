import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Clock, User, Box } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const ENTITY_TYPES = ['product', 'inventory', 'purchase_order', 'serial_number', 'gift_card', 'export', 'invoice', 'task', 'user', 'other'];

export default function ActivityLog() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 100)
  });

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.action?.toLowerCase().includes(search.toLowerCase()) ||
      activity.details?.toLowerCase().includes(search.toLowerCase()) ||
      activity.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entityFilter === 'all' || activity.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const getEntityIcon = (type) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Box className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <PageHeader 
        title="Activity Log" 
        description="Full audit trail of all actions"
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ENTITY_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {getEntityIcon(activity.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{activity.action}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{activity.details}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm text-slate-500">{activity.user_name || activity.user_email}</span>
                          <StatusBadge status={activity.entity_type} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-slate-500">
                          {format(new Date(activity.created_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(activity.created_date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}