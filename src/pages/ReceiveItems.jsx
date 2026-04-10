import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PackageCheck, Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ReceiveItems() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receivingData, setReceivingData] = useState({});
  const [serialNumbers, setSerialNumbers] = useState({});

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: () => base44.entities.PurchaseOrder.filter({ 
      status: { $in: ['ordered', 'shipped', 'partially_received'] }
    })
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const logActivity = async (action, entityType, details) => {
    const user = await base44.auth.me();
    await base44.entities.ActivityLog.create({
      action,
      entity_type: entityType,
      details,
      user_name: user.full_name,
      user_email: user.email
    });
  };

  const openReceiveDialog = (order) => {
    setSelectedOrder(order);
    const initialData = {};
    const initialSerials = {};
    order.items?.forEach((item, idx) => {
      const remaining = item.quantity_ordered - (item.quantity_received || 0);
      initialData[idx] = remaining;
      initialSerials[idx] = [];
    });
    setReceivingData(initialData);
    setSerialNumbers(initialSerials);
    setReceiveDialogOpen(true);
  };

  const addSerialNumber = (itemIndex) => {
    setSerialNumbers({
      ...serialNumbers,
      [itemIndex]: [...(serialNumbers[itemIndex] || []), '']
    });
  };

  const updateSerialNumber = (itemIndex, serialIndex, value) => {
    const newSerials = [...serialNumbers[itemIndex]];
    newSerials[serialIndex] = value;
    setSerialNumbers({ ...serialNumbers, [itemIndex]: newSerials });
  };

  const removeSerialNumber = (itemIndex, serialIndex) => {
    const newSerials = serialNumbers[itemIndex].filter((_, i) => i !== serialIndex);
    setSerialNumbers({ ...serialNumbers, [itemIndex]: newSerials });
  };

  const handleReceive = async () => {
    try {
      const user = await base44.auth.me();
      
      // Update inventory and create serial numbers
      for (let i = 0; i < selectedOrder.items.length; i++) {
        const item = selectedOrder.items[i];
        const quantityReceiving = receivingData[i] || 0;
        
        if (quantityReceiving > 0) {
          // Create inventory item
          await base44.entities.InventoryItem.create({
            product_id: item.product_id,
            product_name: item.product_name,
            sku: item.sku,
            quantity: quantityReceiving,
            status: 'in_stock',
            purchase_order_id: selectedOrder.id,
            unit_cost: item.unit_cost
          });

          // Create serial numbers
          const serials = serialNumbers[i]?.filter(s => s.trim()) || [];
          for (const serial of serials) {
            await base44.entities.SerialNumber.create({
              serial,
              product_id: item.product_id,
              product_name: item.product_name,
              status: 'in_stock'
            });
          }
        }
      }

      // Update order items
      const updatedItems = selectedOrder.items.map((item, idx) => ({
        ...item,
        quantity_received: (item.quantity_received || 0) + (receivingData[idx] || 0)
      }));

      // Check if fully received
      const allReceived = updatedItems.every(item => item.quantity_received >= item.quantity_ordered);
      const someReceived = updatedItems.some(item => item.quantity_received > 0);

      await updateOrderMutation.mutateAsync({
        id: selectedOrder.id,
        data: {
          items: updatedItems,
          status: allReceived ? 'received' : (someReceived ? 'partially_received' : selectedOrder.status)
        }
      });

      await logActivity('Received items', 'inventory', `Received items from order ${selectedOrder.order_number}`);
      toast.success('Items received successfully');
      setReceiveDialogOpen(false);
    } catch (error) {
      toast.error('Failed to receive items');
      console.error(error);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Receive Items</h1>
        <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Mark purchased items as received and assign serial numbers</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
          <PackageCheck className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--ink-ghost)' }} />
          <p style={{ color: 'var(--ink-dim)' }}>No pending orders to receive</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map(order => (
            <div key={order.id} style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{order.order_number}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{order.supplier}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="space-y-2 mb-4">
                {order.items?.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.product_name}</span>
                    <span className="font-medium">{item.quantity_received || 0}/{item.quantity_ordered}</span>
                  </div>
                ))}
                {(order.items?.length || 0) > 3 && (
                  <p className="text-xs text-slate-400">+{order.items.length - 3} more items</p>
                )}
              </div>
              <Button
                style={{ width: '100%', background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}
                onClick={() => openReceiveDialog(order)}
              >
                <PackageCheck className="h-4 w-4 mr-2" /> Receive Items
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Items - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrder?.items?.map((item, idx) => {
              const remaining = item.quantity_ordered - (item.quantity_received || 0);
              return (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{item.product_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Remaining: {remaining}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <Label>Quantity Receiving</Label>
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        value={receivingData[idx] || 0}
                        onChange={(e) => setReceivingData({
                          ...receivingData,
                          [idx]: Math.min(parseInt(e.target.value) || 0, remaining)
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Serial Numbers (Optional)</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => addSerialNumber(idx)}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {serialNumbers[idx]?.map((serial, sIdx) => (
                        <div key={sIdx} className="flex gap-2">
                          <Input
                            placeholder="Enter serial number"
                            value={serial}
                            onChange={(e) => updateSerialNumber(idx, sIdx, e.target.value)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeSerialNumber(idx, sIdx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
            <Button style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }} onClick={handleReceive}>
              <Check className="h-4 w-4 mr-2" /> Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}