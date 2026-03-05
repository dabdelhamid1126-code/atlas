import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Package, MapPin, Clock, CheckCircle, AlertCircle, Truck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const CARRIERS = [
  { value: 'usps', label: 'USPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'dhl_express', label: 'DHL Express' },
  { value: 'ontrac', label: 'OnTrac' },
  { value: 'lasership', label: 'LaserShip' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'shippo', label: 'Shippo (Test)' },
];

const STATUS_CONFIG = {
  DELIVERED:    { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Delivered' },
  TRANSIT:      { icon: Truck,        color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200',   label: 'In Transit' },
  OUT_FOR_DELIVERY: { icon: Truck,   color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', label: 'Out for Delivery' },
  PRE_TRANSIT:  { icon: Package,     color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200',  label: 'Pre-Transit' },
  RETURNED:     { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200',  label: 'Returned' },
  FAILURE:      { icon: AlertCircle, color: 'text-red-600',   bg: 'bg-red-50 border-red-200',      label: 'Delivery Failed' },
  UNKNOWN:      { icon: Package,     color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200',  label: 'Unknown' },
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export default function PackageTracking() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim() || !carrier) {
      toast.error('Please enter a tracking number and select a carrier');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data } = await base44.functions.invoke('shippoTracking', {
        tracking_number: trackingNumber.trim(),
        carrier
      });
      setResult(data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch tracking information');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = result ? (STATUS_CONFIG[result.status] || STATUS_CONFIG.UNKNOWN) : null;

  return (
    <div>
      <PageHeader
        title="Package Tracking"
        description="Track packages using Shippo"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800 text-white h-11 px-8"
              disabled={loading}
            >
              {loading ? 'Tracking...' : <><Search className="h-4 w-4 mr-2" /> Track Package</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && statusInfo && (
        <div className="space-y-4">
          {/* Status Summary */}
          <Card className={`border-2 ${statusInfo.bg}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <statusInfo.icon className={`h-8 w-8 ${statusInfo.color}`} />
                  <div>
                    <p className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{result.status_details}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-medium">{result.carrier}</p>
                  <p className="font-mono text-sm text-slate-700">{result.tracking_number}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {result.current_location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Current Location</p>
                      <p className="text-sm font-medium">{result.current_location}</p>
                    </div>
                  </div>
                )}
                {result.address_from && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">From</p>
                      <p className="text-sm font-medium">{result.address_from}</p>
                    </div>
                  </div>
                )}
                {result.address_to && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">To</p>
                      <p className="text-sm font-medium">{result.address_to}</p>
                    </div>
                  </div>
                )}
                {result.eta && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Estimated Delivery</p>
                      <p className="text-sm font-medium">{formatDate(result.eta)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tracking History */}
          {result.events && result.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracking History ({result.events.length} events)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {result.events.map((event, i) => {
                    const evtInfo = STATUS_CONFIG[event.status] || STATUS_CONFIG.UNKNOWN;
                    const Icon = evtInfo.icon;
                    return (
                      <div key={i} className="flex gap-4 pb-6 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-white ${i === 0 ? 'border-black' : 'border-slate-200'}`}>
                            <Icon className={`h-4 w-4 ${i === 0 ? 'text-black' : 'text-slate-400'}`} />
                          </div>
                          {i < result.events.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="pb-2 pt-1">
                          <p className={`text-sm font-medium ${i === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                            {event.status_details}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {event.location && event.location !== 'N/A' && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{event.location}
                              </span>
                            )}
                            {event.date && (
                              <span className="text-xs text-slate-400">{formatDate(event.date)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-14 w-14 mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Track a Package</h3>
            <p className="text-slate-500">Enter a tracking number and select a carrier above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}