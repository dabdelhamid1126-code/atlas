import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const STATUSES = ['Pending', 'In Transit', 'Out for Delivery', 'Delivered', 'Exception'];

const statusColors = {
  'Pending': 'bg-slate-100 text-slate-700',
  'In Transit': 'bg-blue-100 text-blue-700',
  'Out for Delivery': 'bg-orange-100 text-orange-700',
  'Delivered': 'bg-green-100 text-green-700',
  'Exception': 'bg-red-100 text-red-700',
};

const emptyShipment = {
  tracking_number: '', sender_name: '', recipient_name: '',
  origin_address: '', destination_address: '', carrier_name: '',
  service_type: '', weight: '', estimated_delivery_date: '', current_status: 'Pending',
};

const emptyUpdate = {
  tracking_number: '', shipment_id: '', status: 'In Transit',
  location: '', description: '', event_datetime: '',
};

export default function TrackingAdmin() {
  const queryClient = useQueryClient();
  const [shipmentDialog, setShipmentDialog] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentForm, setShipmentForm] = useState(emptyShipment);
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const [search, setSearch] = useState('');

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => base44.entities.Shipment.list('-created_date'),
  });

  const { data: allUpdates = [] } = useQuery({
    queryKey: ['trackingUpdates'],
    queryFn: () => base44.entities.TrackingUpdate.list('-event_datetime'),
  });

  const createShipment = useMutation({
    mutationFn: (data) => base44.entities.Shipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment created');
      setShipmentDialog(false);
      setShipmentForm(emptyShipment);
    },
  });

  const updateShipment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment updated');
      setShipmentDialog(false);
      setEditingShipment(null);
    },
  });

  const deleteShipment = useMutation({
    mutationFn: async (shipment) => {
      const updates = allUpdates.filter(u => u.shipment_id === shipment.id);
      for (const u of updates) await base44.entities.TrackingUpdate.delete(u.id);
      await base44.entities.Shipment.delete(shipment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['trackingUpdates'] });
      toast.success('Shipment deleted');
    },
  });

  const createUpdate = useMutation({
    mutationFn: async (data) => {
      const update = await base44.entities.TrackingUpdate.create(data);
      // Also update shipment's current status
      await base44.entities.Shipment.update(data.shipment_id, { current_status: data.status });
      return update;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackingUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Tracking update added');
      setUpdateDialog(false);
      setUpdateForm(emptyUpdate);
    },
  });

  const deleteUpdate = useMutation({
    mutationFn: (id) => base44.entities.TrackingUpdate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackingUpdates'] });
      toast.success('Update deleted');
    },
  });

  const openShipmentDialog = (shipment = null) => {
    if (shipment) {
      setEditingShipment(shipment);
      setShipmentForm({
        tracking_number: shipment.tracking_number || '',
        sender_name: shipment.sender_name || '',
        recipient_name: shipment.recipient_name || '',
        origin_address: shipment.origin_address || '',
        destination_address: shipment.destination_address || '',
        carrier_name: shipment.carrier_name || '',
        service_type: shipment.service_type || '',
        weight: shipment.weight || '',
        estimated_delivery_date: shipment.estimated_delivery_date || '',
        current_status: shipment.current_status || 'Pending',
      });
    } else {
      setEditingShipment(null);
      setShipmentForm(emptyShipment);
    }
    setShipmentDialog(true);
  };

  const openUpdateDialog = (shipment) => {
    setUpdateForm({
      ...emptyUpdate,
      tracking_number: shipment.tracking_number,
      shipment_id: shipment.id,
      event_datetime: new Date().toISOString().slice(0, 16),
    });
    setUpdateDialog(true);
  };

  const openDetails = (shipment) => {
    setSelectedShipment(shipment);
    setDetailsDialog(true);
  };

  const handleShipmentSubmit = (e) => {
    e.preventDefault();
    const data = { ...shipmentForm, weight: shipmentForm.weight ? parseFloat(shipmentForm.weight) : null };
    if (editingShipment) {
      updateShipment.mutate({ id: editingShipment.id, data });
    } else {
      const exists = shipments.find(s => s.tracking_number === shipmentForm.tracking_number);
      if (exists) { toast.error('Tracking number already exists'); return; }
      createShipment.mutate(data);
    }
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    createUpdate.mutate(updateForm);
  };

  const filtered = shipments.filter(s =>
    !search ||
    s.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.carrier_name?.toLowerCase().includes(search.toLowerCase())
  );

  const shipmentUpdates = selectedShipment
    ? allUpdates.filter(u => u.shipment_id === selectedShipment.id).sort((a, b) => new Date(b.event_datetime) - new Date(a.event_datetime))
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipment Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage shipments and tracking updates</p>
        </div>
        <Button onClick={() => openShipmentDialog()} className="bg-black hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Shipment
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by tracking #, recipient, carrier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No shipments found</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tracking #</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Recipient</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Carrier</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Est. Delivery</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold">{s.tracking_number}</td>
                    <td className="px-4 py-3">{s.recipient_name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.carrier_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[s.current_status]}`}>
                        {s.current_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.estimated_delivery_date ? format(parseISO(s.estimated_delivery_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetails(s)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openUpdateDialog(s)} title="Add update">
                          <Clock className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openShipmentDialog(s)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm('Delete this shipment and all its updates?')) deleteShipment.mutate(s);
                        }} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipment Dialog */}
      <Dialog open={shipmentDialog} onOpenChange={setShipmentDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShipment ? 'Edit Shipment' : 'New Shipment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShipmentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tracking Number *</Label>
                <Input value={shipmentForm.tracking_number} onChange={e => setShipmentForm({...shipmentForm, tracking_number: e.target.value})} required disabled={!!editingShipment} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={shipmentForm.current_status} onValueChange={v => setShipmentForm({...shipmentForm, current_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Sender Name</Label>
                <Input value={shipmentForm.sender_name} onChange={e => setShipmentForm({...shipmentForm, sender_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Recipient Name *</Label>
                <Input value={shipmentForm.recipient_name} onChange={e => setShipmentForm({...shipmentForm, recipient_name: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Origin Address</Label>
              <Input value={shipmentForm.origin_address} onChange={e => setShipmentForm({...shipmentForm, origin_address: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Destination Address</Label>
              <Input value={shipmentForm.destination_address} onChange={e => setShipmentForm({...shipmentForm, destination_address: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Carrier</Label>
                <Input value={shipmentForm.carrier_name} onChange={e => setShipmentForm({...shipmentForm, carrier_name: e.target.value})} placeholder="FedEx, UPS..." />
              </div>
              <div className="space-y-1">
                <Label>Service Type</Label>
                <Input value={shipmentForm.service_type} onChange={e => setShipmentForm({...shipmentForm, service_type: e.target.value})} placeholder="Ground, Express..." />
              </div>
              <div className="space-y-1">
                <Label>Weight (lbs)</Label>
                <Input type="number" step="0.01" value={shipmentForm.weight} onChange={e => setShipmentForm({...shipmentForm, weight: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Estimated Delivery Date</Label>
              <Input type="date" value={shipmentForm.estimated_delivery_date} onChange={e => setShipmentForm({...shipmentForm, estimated_delivery_date: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShipmentDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">
                {editingShipment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Update Dialog */}
      <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tracking Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <span className="text-slate-500">Shipment: </span>
              <span className="font-mono font-semibold">{updateForm.tracking_number}</span>
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select value={updateForm.status} onValueChange={v => setUpdateForm({...updateForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={updateForm.event_datetime} onChange={e => setUpdateForm({...updateForm, event_datetime: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={updateForm.location} onChange={e => setUpdateForm({...updateForm, location: e.target.value})} placeholder="City, State" />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea value={updateForm.description} onChange={e => setUpdateForm({...updateForm, description: e.target.value})} placeholder="Package has departed facility..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpdateDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">Add Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-lg">{selectedShipment.tracking_number}</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedShipment.current_status]}`}>
                  {selectedShipment.current_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedShipment.sender_name && <div><span className="text-slate-500">From: </span>{selectedShipment.sender_name}</div>}
                <div><span className="text-slate-500">To: </span>{selectedShipment.recipient_name}</div>
                {selectedShipment.origin_address && <div><span className="text-slate-500">Origin: </span>{selectedShipment.origin_address}</div>}
                {selectedShipment.destination_address && <div><span className="text-slate-500">Destination: </span>{selectedShipment.destination_address}</div>}
                {selectedShipment.carrier_name && <div><span className="text-slate-500">Carrier: </span>{selectedShipment.carrier_name}</div>}
                {selectedShipment.service_type && <div><span className="text-slate-500">Service: </span>{selectedShipment.service_type}</div>}
                {selectedShipment.weight && <div><span className="text-slate-500">Weight: </span>{selectedShipment.weight} lbs</div>}
                {selectedShipment.estimated_delivery_date && (
                  <div><span className="text-slate-500">Est. Delivery: </span>{format(parseISO(selectedShipment.estimated_delivery_date), 'MMM d, yyyy')}</div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">Tracking History ({shipmentUpdates.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => { setDetailsDialog(false); openUpdateDialog(selectedShipment); }}>
                    <Plus className="h-3 w-3 mr-1" /> Add Update
                  </Button>
                </div>
                {shipmentUpdates.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No updates yet</p>
                ) : (
                  <div className="space-y-3">
                    {shipmentUpdates.map((u) => (
                      <div key={u.id} className="flex gap-3 relative">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${statusColors[u.status].split(' ')[0]}`} />
                          <div className="w-0.5 bg-slate-200 flex-1 mt-1" />
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[u.status]}`}>{u.status}</span>
                              {u.location && <span className="text-xs text-slate-500 ml-2">{u.location}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {format(new Date(u.event_datetime), 'MMM d, h:mm a')}
                              </span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteUpdate.mutate(u.id)}>
                                <Trash2 className="h-3 w-3 text-red-400" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 mt-1">{u.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}