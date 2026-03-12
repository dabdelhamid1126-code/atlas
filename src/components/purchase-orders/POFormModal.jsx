import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import ProductSearchDropdown from '@/components/ProductSearchDropdown';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];
const CATEGORIES = ['dining', 'travel', 'groceries', 'gas', 'streaming', 'other'];
const RETAILERS = ['Amazon', 'Bestbuy', 'Walmart', 'Target', 'Costco', 'Sam\'s Club', 'eBay', 'Woot', 'Apple', 'Other'];

export default function POFormModal({
  open,
  onOpenChange,
  order,
  onSubmit,
  products,
  creditCards,
  giftCards,
  sellers,
  isPending
}) {
  const [formData, setFormData] = useState(order ? {
    order_number: order.order_number || '',
    tracking_number: order.tracking_number || '',
    retailer: order.retailer || '',
    status: order.status || 'pending',
    category: order.category || 'other',
    credit_card_id: order.credit_card_id || '',
    gift_card_ids: order.gift_card_ids || [],
    is_pickup: order.is_pickup || false,
    pickup_location: order.pickup_location || '',
    is_dropship: order.is_dropship || false,
    dropship_to: order.dropship_to || '',
    order_date: order.order_date || '',
    expected_date: order.expected_date || '',
    notes: order.notes || '',
    items: order.items || [],
  } : {
    order_number: '',
    tracking_number: '',
    retailer: '',
    status: 'pending',
    category: 'other',
    credit_card_id: '',
    gift_card_ids: [],
    is_pickup: false,
    pickup_location: '',
    is_dropship: false,
    dropship_to: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_date: '',
    notes: '',
    items: [],
  });

  const [productSearches, setProductSearches] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.order_number?.trim()) {
      toast.error('Order number is required');
      return;
    }
    if (!formData.retailer?.trim()) {
      toast.error('Retailer is required');
      return;
    }
    if (!formData.category?.trim()) {
      toast.error('Category is required');
      return;
    }

    const totalCost = formData.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (item.unit_cost || 0)), 0);
    const giftCardValue = formData.gift_card_ids.reduce((sum, id) => {
      const gc = giftCards.find(g => g.id === id);
      return sum + (gc?.value || 0);
    }, 0);

    const dataToSubmit = {
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        quantity_ordered: parseInt(item.quantity_ordered) || 0,
        quantity_received: parseInt(item.quantity_received) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0
      })),
      total_cost: totalCost,
      gift_card_value: giftCardValue,
      final_cost: totalCost - giftCardValue,
      credit_card_id: formData.credit_card_id || null,
    };

    onSubmit(dataToSubmit);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0 }]
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'quantity_ordered' || field === 'quantity_received') {
      newItems[index][field] = value === '' ? '' : parseInt(value) || 0;
    } else if (field === 'unit_cost') {
      newItems[index][field] = value === '' ? '' : parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...formData.items];
    newItems[index].product_id = product.id;
    newItems[index].product_name = product.name;
    newItems[index].upc = product.upc;
    newItems[index].unit_cost = product.price ? parseFloat(product.price) : 0;
    newItems[index].quantity_ordered = 1;
    newItems[index].quantity_received = 0;
    setFormData({ ...formData, items: newItems });
    setProductSearches({ ...productSearches, [index]: '' });
  };

  const itemSubtotal = formData.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (item.unit_cost || 0)), 0);
  const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => {
    const gc = giftCards.find(g => g.id === id);
    return sum + (gc?.value || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Order Number + Tracking */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                placeholder="e.g., AMZ-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                placeholder="Tracking number"
              />
            </div>
          </div>

          {/* Row 2: Retailer + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retailer *</Label>
              <Select value={formData.retailer} onValueChange={(v) => setFormData({ ...formData, retailer: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select retailer" />
                </SelectTrigger>
                <SelectContent>
                  {RETAILERS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => {
                if (v === 'received') {
                  const updatedItems = formData.items.map(item => ({
                    ...item,
                    quantity_received: item.quantity_ordered
                  }));
                  setFormData({ ...formData, status: v, items: updatedItems });
                } else {
                  setFormData({ ...formData, status: v });
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-purple-600">Category determines reward points rate</p>
          </div>

          {/* Pickup/Dropship Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_pickup}
                onChange={(e) => setFormData({ ...formData, is_pickup: e.target.checked, is_dropship: e.target.checked ? false : formData.is_dropship })}
                className="rounded"
              />
              <span className="text-sm font-medium">📍 Pickup Order</span>
            </label>
            {formData.is_pickup && (
              <Input
                value={formData.pickup_location}
                onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                placeholder="Pickup location"
                className="ml-6"
              />
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_dropship}
                onChange={(e) => setFormData({ ...formData, is_dropship: e.target.checked, is_pickup: e.target.checked ? false : formData.is_pickup })}
                className="rounded"
              />
              <span className="text-sm font-medium">🚚 Dropship Order</span>
              <span className="text-xs text-slate-500">(ships directly to seller)</span>
            </label>
            {formData.is_dropship && (
              <Select value={formData.dropship_to} onValueChange={(v) => setFormData({ ...formData, dropship_to: v })}>
                <SelectTrigger className="ml-6">
                  <SelectValue placeholder="Select seller" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Credit Card */}
          <div className="space-y-2">
            <Label>Credit Card (optional)</Label>
            <Select value={formData.credit_card_id || ''} onValueChange={(v) => setFormData({ ...formData, credit_card_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select card (optional)" />
              </SelectTrigger>
              <SelectContent>
                {creditCards.filter(c => c.active).map(card => {
                  const lastFour = card.id?.slice(-4) || 'XXXX';
                  return (
                    <SelectItem key={card.id} value={card.id}>
                      {card.card_name || 'Unnamed Card'} ({lastFour})
                    </SelectItem>
                  );
                })}
              </SelectContent>
              </Select>
              {formData.credit_card_id && (
              <div className="text-sm text-slate-600">
                Selected: {creditCards.find(c => c.id === formData.credit_card_id)?.card_name || 'Unnamed Card'} ({creditCards.find(c => c.id === formData.credit_card_id)?.id.slice(-4)})
              </div>
              )}
              </div>

          {/* Gift Cards */}
          <div className="space-y-2">
            <Label>Gift Cards</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).map(gc => {
                const lastThree = gc.code?.slice(-3) || 'XXX';
                return (
                  <label key={gc.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.gift_card_ids.includes(gc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, gift_card_ids: [...formData.gift_card_ids, gc.id] });
                        } else {
                          setFormData({ ...formData, gift_card_ids: formData.gift_card_ids.filter(id => id !== gc.id) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{gc.brand} - ${gc.value} ...{lastThree}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Date</Label>
              <Input
                type="date"
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
                  <div style={{ width: '40%' }}>
                    <Label className="text-xs">Product</Label>
                    <ProductSearchDropdown
                      products={products}
                      value={item.product_id}
                      onChange={(productId) => updateItem(index, 'product_id', productId)}
                      onSelect={(product) => handleProductSelect(index, product)}
                      searchValue={productSearches[index] || ''}
                      onSearchChange={(value) => setProductSearches({...productSearches, [index]: value})}
                    />
                  </div>
                  <div style={{ width: '15%' }}>
                    <Label className="text-xs">Qty Ord</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity_ordered}
                      onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div style={{ width: '15%' }}>
                    <Label className="text-xs">Qty Rec</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.quantity_received || 0}
                      onChange={(e) => updateItem(index, 'quantity_received', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div style={{ width: '20%' }}>
                    <Label className="text-xs">Unit Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div style={{ width: '10%' }} className="flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotals */}
          {formData.items.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-semibold">${itemSubtotal.toFixed(2)}</span>
              </div>
              {giftCardTotal > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Gift Cards:</span>
                  <span className="font-semibold">-${giftCardTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Final Total:</span>
                <span>${(itemSubtotal - giftCardTotal).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-black hover:bg-gray-800 text-white" disabled={isPending}>
              {isPending ? 'Saving...' : (order ? 'Update Order' : 'Create Order')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}