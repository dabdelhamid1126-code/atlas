import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, MapPin, Calendar, CheckCircle, Truck, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  'Delivered': {
    color: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  'In Transit': {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: Truck,
    iconColor: 'text-blue-500',
  },
  'Out for Delivery': {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    icon: Truck,
    iconColor: 'text-orange-500',
  },
  'Exception': {
    color: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  'Pending': {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: Clock,
    iconColor: 'text-slate-400',
  },
};

export default function TrackingLookup() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setShipment(null);
    setUpdates([]);
    setSearched(true);

    const trimmed = query.trim();

    // 1. Try local Shipment record
    const results = await base44.entities.Shipment.filter({ tracking_number: trimmed });

    // 2. Fetch live data from external API in parallel
    let liveData = null;
    try {
      const res = await base44.functions.invoke('trackPackageExternal', { tracking_number: trimmed });
      liveData = res?.data;
    } catch (_) {}

    if ((!results || results.length === 0) && (!liveData || !liveData.current_status)) {
      setError('No shipment found with that tracking number.');
      setLoading(false);
      return;
    }

    // Use local record as base, overlay live status if available
    let found = results?.[0] || {
      tracking_number: trimmed,
      current_status: liveData?.current_status || 'In Transit',
      estimated_delivery_date: liveData?.estimated_delivery ? liveData.estimated_delivery.split('T')[0] : null,
    };

    if (liveData?.current_status) {
      found = { ...found, current_status: liveData.current_status };
      if (liveData.estimated_delivery) found.estimated_delivery_date = liveData.estimated_delivery.split('T')[0];
    }

    setShipment(found);

    // Merge local + live events
    let localUpdates = [];
    if (results?.[0]?.id) {
      const tu = await base44.entities.TrackingUpdate.filter({ tracking_number: trimmed });
      localUpdates = tu || [];
    }

    const liveEvents = (liveData?.events || []).map((ev, i) => ({ ...ev, id: `live-${i}` }));
    const existingDates = new Set(localUpdates.map(u => u.event_datetime));
    const merged = [
      ...localUpdates,
      ...liveEvents.filter(ev => !existingDates.has(ev.event_datetime)),
    ].sort((a, b) => new Date(b.event_datetime) - new Date(a.event_datetime));

    setUpdates(merged);
    setLoading(false);
  };

  const config = shipment ? (statusConfig[shipment.current_status] || statusConfig['Pending']) : null;
  const StatusIcon = config?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Track Your Package</h1>
          <p className="text-indigo-200 mb-8">Enter your tracking number to get real-time updates</p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter tracking number..."
                className="pl-10 h-12 bg-white text-slate-900 border-0 shadow-lg text-base"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-12 px-6 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold shadow-lg">
              {loading ? 'Searching...' : 'Track'}
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            {error}
          </div>
        )}

        {shipment && config && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${config.color}`}>
                    <StatusIcon className={`h-6 w-6 ${config.iconColor}`} />
                  </div>
                  <div>
                    <div className="font-mono text-sm text-slate-500">{shipment.tracking_number}</div>
                    <div className="font-bold text-slate-900 text-lg">{shipment.current_status}</div>
                    {updates.length > 0 && (
                      <div className="text-sm text-slate-500">{updates[0].description}</div>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${config.color}`}>
                  {shipment.current_status}
                </span>
              </div>
            </div>

            {/* Shipment Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Shipment Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {shipment.recipient_name && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Recipient</div>
                    <div className="font-medium">{shipment.recipient_name}</div>
                  </div>
                )}
                {shipment.sender_name && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Sender</div>
                    <div className="font-medium">{shipment.sender_name}</div>
                  </div>
                )}
                {shipment.origin_address && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Origin
                    </div>
                    <div className="font-medium">{shipment.origin_address}</div>
                  </div>
                )}
                {shipment.destination_address && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Destination
                    </div>
                    <div className="font-medium">{shipment.destination_address}</div>
                  </div>
                )}
                {shipment.carrier_name && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Carrier</div>
                    <div className="font-medium">{shipment.carrier_name} {shipment.service_type && `— ${shipment.service_type}`}</div>
                  </div>
                )}
                {shipment.estimated_delivery_date && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Est. Delivery
                    </div>
                    <div className="font-medium text-indigo-600">
                      {format(new Date(shipment.estimated_delivery_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Tracking History</h2>
              {updates.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No tracking updates available yet.</p>
              ) : (
                <div className="space-y-0">
                  {updates.map((u, i) => {
                    const uc = statusConfig[u.status] || statusConfig['Pending'];
                    const isLast = i === updates.length - 1;
                    return (
                      <div key={u.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${uc.dot}`} />
                          {!isLast && <div className="w-0.5 bg-slate-200 flex-1 mt-1 mb-1" />}
                        </div>
                        <div className={`flex-1 ${!isLast ? 'pb-5' : 'pb-0'}`}>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${uc.color}`}>
                              {u.status}
                            </span>
                            {u.location && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{u.location}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 font-medium">{u.description}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(u.event_datetime), 'EEEE, MMMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-12 text-slate-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Enter a tracking number above</p>
            <p className="text-sm mt-1">to see your package's status and history</p>
          </div>
        )}
      </div>
    </div>
  );
}