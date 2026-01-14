import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, CreditCard, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CompleteExport() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState([]);
  const [selectedGiftCards, setSelectedGiftCards] = useState([]);
  const [formData, setFormData] = useState({
    export_number: '',
    buyer: '',
    export_date: format(new Date(), 'yyyy-MM-dd'),
    shipping_info: '',
    notes: ''
  });

  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['availableInventory'],
    queryFn: () => base44.entities.InventoryItem.filter({ status: 'in_stock' })
  });

  const { data: giftCards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['availableGiftCards'],
    queryFn: () => base44.entities.GiftCard.filter({ status: 'available' })
  });

  const { data: exports = [] } = useQuery({
    queryKey: ['exports'],
    queryFn: () => base44.entities.Export.list('-created_date', 10)
  });

  const createExportMutation = useMutation({
    mutationFn: async (data) => {
      const exportRecord = await base44.entities.Export.create(data);
      
      // Update inventory items
      for (const itemId of selectedInventory) {
        await base44.entities.InventoryItem.update(itemId, { 
          status: 'exported',
          export_id: exportRecord.id
        });
      }
      
      // Update gift cards
      for (const cardId of selectedGiftCards) {
        await base44.entities.GiftCard.update(cardId, { 
          status: 'exported',
          export_id: exportRecord.id
        });
      }
      
      return exportRecord;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['availableInventory'] });
      queryClient.invalidateQueries({ queryKey: ['availableGiftCards'] });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast.success('Export completed');
      setDialogOpen(false);
      resetForm();
      await logActivity('Completed export', 'export', formData.export_number);
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

  const resetForm = () => {
    setSelectedInventory([]);
    setSelectedGiftCards([]);
    setFormData({
      export_number: '',
      buyer: '',
      export_date: format(new Date(), 'yyyy-MM-dd'),
      shipping_info: '',
      notes: ''
    });
  };

  const openDialog = () => {
    setFormData({
      ...formData,
      export_number: `EXP-${Date.now().toString().slice(-8)}`
    });
    setDialogOpen(true);
  };

  const toggleInventoryItem = (id) => {
    setSelectedInventory(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleGiftCard = (id) => {
    setSelectedGiftCards(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    const inventoryTotal = selectedInventory.reduce((sum, id) => {
      const item = inventory.find(i => i.id === id);
      return sum + (item?.unit_cost * item?.quantity || 0);
    }, 0);
    
    const cardsTotal = selectedGiftCards.reduce((sum, id) => {
      const card = giftCards.find(c => c.id === id);
      return sum + (card?.value || 0);
    }, 0);
    
    return inventoryTotal + cardsTotal;
  };

  const handleSubmit = () => {
    if (selectedInventory.length === 0 && selectedGiftCards.length === 0) {
      toast.error('Please select at least one item to export');
      return;
    }

    const items = selectedInventory.map(id => {
      const item = inventory.find(i => i.id === id);
      return {
        inventory_item_id: id,
        product_name: item?.product_name,
        quantity: item?.quantity,
        unit_price: item?.unit_cost
      };
    });

    createExportMutation.mutate({
      ...formData,
      items,
      gift_cards: selectedGiftCards,
      total_value: calculateTotal(),
      status: 'completed'
    });
  };

  return (
    <div>
      <PageHeader 
        title="Complete Export" 
        description="Export inventory to buyers"
        actions={
          <Button onClick={openDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> New Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Available Items</p>
                <p className="text-xl font-semibold">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Available Gift Cards</p>
                <p className="text-xl font-semibold">{giftCards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Recent Exports</p>
                <p className="text-xl font-semibold">{exports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Exports</CardTitle>
        </CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No exports yet</p>
          ) : (
            <div className="space-y-3">
              {exports.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm font-medium text-emerald-600">{exp.export_number}</p>
                    <p className="text-sm text-slate-500">{exp.buyer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${exp.total_value?.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{format(new Date(exp.created_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Export</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Number</Label>
                <Input value={formData.export_number} disabled />
              </div>
              <div className="space-y-2">
                <Label>Buyer *</Label>
                <Input
                  value={formData.buyer}
                  onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Export Date</Label>
                <Input
                  type="date"
                  value={formData.export_date}
                  onChange={(e) => setFormData({ ...formData, export_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipping Info</Label>
                <Input
                  value={formData.shipping_info}
                  onChange={(e) => setFormData({ ...formData, shipping_info: e.target.value })}
                />
              </div>
            </div>

            <Tabs defaultValue="inventory">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inventory">
                  <Package className="h-4 w-4 mr-2" />
                  Inventory ({selectedInventory.length})
                </TabsTrigger>
                <TabsTrigger value="giftcards">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gift Cards ({selectedGiftCards.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="inventory" className="max-h-60 overflow-y-auto">
                {inventory.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No inventory available</p>
                ) : (
                  <div className="space-y-2">
                    {inventory.map(item => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleInventoryItem(item.id)}
                      >
                        <Checkbox checked={selectedInventory.includes(item.id)} />
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">${(item.unit_cost * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="giftcards" className="max-h-60 overflow-y-auto">
                {giftCards.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No gift cards available</p>
                ) : (
                  <div className="space-y-2">
                    {giftCards.map(card => (
                      <div 
                        key={card.id} 
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleGiftCard(card.id)}
                      >
                        <Checkbox checked={selectedGiftCards.includes(card.id)} />
                        <div className="flex-1">
                          <p className="font-medium">{card.brand}</p>
                          <p className="text-sm text-slate-500 font-mono">{card.code?.slice(0, 4)}****</p>
                        </div>
                        <p className="font-semibold text-emerald-600">${card.value?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Export Value</span>
                <span className="text-xl font-bold text-emerald-600">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4 mr-2" /> Complete Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}