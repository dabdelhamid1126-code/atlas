import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Barcode, Hash, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ScanReceive() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('tracking'); // tracking, upc, serial, complete
  const [trackingNumber, setTrackingNumber] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [currentUPC, setCurrentUPC] = useState('');
  const [currentSerials, setCurrentSerials] = useState([]);
  const [currentSerial, setCurrentSerial] = useState('');
  
  const trackingInputRef = useRef(null);
  const upcInputRef = useRef(null);
  const serialInputRef = useRef(null);

  useEffect(() => {
    if (step === 'tracking') trackingInputRef.current?.focus();
    if (step === 'upc') upcInputRef.current?.focus();
    if (step === 'serial') serialInputRef.current?.focus();
  }, [step]);

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

  const handleTrackingScan = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    try {
      const orders = await base44.entities.PurchaseOrder.list();
      const order = orders.find(o => o.tracking_number === trackingNumber.trim());
      
      if (!order) {
        toast.error('Purchase order not found with this tracking number');
        return;
      }

      if (order.status === 'received') {
        toast.error('This order has already been fully received');
        return;
      }

      setPurchaseOrder(order);
      setStep('upc');
      toast.success(`Order ${order.order_number} loaded`);
    } catch (error) {
      toast.error('Error finding order');
      console.error(error);
    }
  };

  const handleUPCScan = async (e) => {
    e.preventDefault();
    if (!currentUPC.trim()) return;

    const upc = currentUPC.trim();
    const orderItem = purchaseOrder.items.find(item => item.upc === upc);

    if (!orderItem) {
      toast.error('UPC not found in this order');
      setCurrentUPC('');
      return;
    }

    const alreadyScanned = scannedItems.filter(item => item.upc === upc);
    const remaining = orderItem.quantity_ordered - (orderItem.quantity_received || 0) - alreadyScanned.length;

    if (remaining <= 0) {
      toast.error('All items with this UPC have been received');
      setCurrentUPC('');
      return;
    }

    // Check if product requires serial number
    const products = await base44.entities.Product.list();
    const product = products.find(p => p.id === orderItem.product_id);
    const requiresSerial = product?.category === 'phones' || product?.category === 'laptops' || product?.category === 'tablets';

    if (requiresSerial) {
      setStep('serial');
      setCurrentSerials([]);
      toast.success(`Scan serial number for ${orderItem.product_name}`);
    } else {
      // Add directly without serial
      setScannedItems([...scannedItems, { ...orderItem, serial: null }]);
      setCurrentUPC('');
      toast.success(`Added ${orderItem.product_name}`);
    }
  };

  const handleSerialScan = (e) => {
    e.preventDefault();
    if (!currentSerial.trim()) return;

    const serial = currentSerial.trim();
    
    if (currentSerials.includes(serial)) {
      toast.error('Serial number already scanned');
      setCurrentSerial('');
      return;
    }

    setCurrentSerials([...currentSerials, serial]);
    setCurrentSerial('');
    toast.success('Serial number recorded');
  };

  const finishCurrentItem = () => {
    const orderItem = purchaseOrder.items.find(item => item.upc === currentUPC);
    currentSerials.forEach(serial => {
      setScannedItems(prev => [...prev, { ...orderItem, serial }]);
    });
    setCurrentUPC('');
    setCurrentSerials([]);
    setStep('upc');
    toast.success('Item(s) added');
  };

  const completeReceiving = async () => {
    try {
      const user = await base44.auth.me();
      
      // Group scanned items by product
      const itemGroups = {};
      scannedItems.forEach(item => {
        const key = item.product_id;
        if (!itemGroups[key]) {
          itemGroups[key] = {
            ...item,
            quantity: 0,
            serials: []
          };
        }
        itemGroups[key].quantity++;
        if (item.serial) {
          itemGroups[key].serials.push(item.serial);
        }
      });

      // Create inventory items
      for (const group of Object.values(itemGroups)) {
        await base44.entities.InventoryItem.create({
          product_id: group.product_id,
          product_name: group.product_name,
          sku: group.sku,
          quantity: group.quantity,
          status: 'in_stock',
          purchase_order_id: purchaseOrder.id,
          unit_cost: group.unit_cost
        });

        // Create serial numbers
        for (const serial of group.serials) {
          await base44.entities.SerialNumber.create({
            serial,
            product_id: group.product_id,
            product_name: group.product_name,
            purchase_order_id: purchaseOrder.id,
            order_number: purchaseOrder.order_number,
            tracking_number: purchaseOrder.tracking_number,
            status: 'in_stock'
          });
        }
      }

      // Update order items
      const updatedItems = purchaseOrder.items.map(item => {
        const scannedCount = scannedItems.filter(s => s.product_id === item.product_id).length;
        return {
          ...item,
          quantity_received: (item.quantity_received || 0) + scannedCount
        };
      });

      // Check if fully received
      const allReceived = updatedItems.every(item => item.quantity_received >= item.quantity_ordered);

      await updateOrderMutation.mutateAsync({
        id: purchaseOrder.id,
        data: {
          items: updatedItems,
          status: allReceived ? 'received' : 'partially_received'
        }
      });

      await logActivity('Received items via scan', 'inventory', `Received ${scannedItems.length} items from order ${purchaseOrder.order_number}`);
      
      setStep('complete');
      toast.success('Items received successfully');
    } catch (error) {
      toast.error('Error completing receiving');
      console.error(error);
    }
  };

  const reset = () => {
    setStep('tracking');
    setTrackingNumber('');
    setPurchaseOrder(null);
    setScannedItems([]);
    setCurrentUPC('');
    setCurrentSerials([]);
    setCurrentSerial('');
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto">
        <PageHeader 
          title="Scan & Receive" 
          description="Scan tracking, UPC codes, and serial numbers"
        />

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'tracking' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center font-bold ${
                step === 'tracking' ? 'border-indigo-600 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg' : 
                ['upc', 'serial', 'complete'].includes(step) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400'
              }`}>
                {['upc', 'serial', 'complete'].includes(step) ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <span className="text-sm font-semibold">Tracking</span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
            <div className={`flex items-center gap-2 ${step === 'upc' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center font-bold ${
                step === 'upc' ? 'border-indigo-600 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg' : 
                ['serial', 'complete'].includes(step) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400'
              }`}>
                {['serial', 'complete'].includes(step) ? <CheckCircle2 className="h-5 w-5" /> : '2'}
              </div>
              <span className="text-sm font-semibold">UPC Scan</span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
            <div className={`flex items-center gap-2 ${['serial', 'complete'].includes(step) ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center font-bold ${
                ['serial', 'complete'].includes(step) ? 'border-indigo-600 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg' : 'border-slate-300 text-slate-400'
              }`}>
                {step === 'complete' ? <CheckCircle2 className="h-5 w-5" /> : '3'}
              </div>
              <span className="text-sm font-semibold">Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Tracking Number */}
        {step === 'tracking' && (
          <Card className="card-modern border-0 shadow-xl animate-slide-up">
            <CardHeader className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                Scan Tracking Number
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <form onSubmit={handleTrackingScan} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Tracking Number</Label>
                  <Input
                    ref={trackingInputRef}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Scan or enter tracking number"
                    className="h-16 text-lg border-2 border-slate-200 focus:border-indigo-500 rounded-xl"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg rounded-xl">
                  Continue <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: UPC Scanning */}
        {step === 'upc' && (
          <div className="space-y-6">
            <Card className="card-modern border-0 shadow-xl animate-slide-up">
              <CardHeader className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Barcode className="h-5 w-5" />
                  </div>
                  Scan UPC Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-8">
                <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Order: {purchaseOrder?.order_number}</p>
                  <p className="text-sm text-slate-600">Retailer: {purchaseOrder?.retailer}</p>
                </div>
                <form onSubmit={handleUPCScan} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">UPC Code</Label>
                    <Input
                      ref={upcInputRef}
                      value={currentUPC}
                      onChange={(e) => setCurrentUPC(e.target.value)}
                      placeholder="Scan UPC barcode"
                      className="h-16 text-lg border-2 border-slate-200 focus:border-indigo-500 rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg rounded-xl">
                    Scan Item <Barcode className="h-5 w-5 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Scanned Items */}
            {scannedItems.length > 0 && (
              <Card className="card-modern border-0 shadow-xl animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Scanned Items 
                    <span className="text-sm font-normal px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      {scannedItems.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-6">
                    {scannedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                        <div>
                          <p className="font-semibold text-slate-900">{item.product_name}</p>
                          {item.serial && <p className="text-sm text-slate-600 font-mono mt-1">{item.serial}</p>}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={completeReceiving} className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-base font-semibold shadow-lg rounded-xl">
                    Complete Receiving <CheckCircle2 className="h-5 w-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Serial Number Scanning */}
        {step === 'serial' && (
          <Card className="card-modern border-0 shadow-xl animate-slide-up">
            <CardHeader className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Hash className="h-5 w-5" />
                </div>
                Scan Serial Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-700">Current Item</p>
                <p className="text-base font-bold text-slate-900">
                  {purchaseOrder?.items.find(i => i.upc === currentUPC)?.product_name}
                </p>
              </div>

              <form onSubmit={handleSerialScan} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Serial Number</Label>
                  <Input
                    ref={serialInputRef}
                    value={currentSerial}
                    onChange={(e) => setCurrentSerial(e.target.value)}
                    placeholder="Scan serial number"
                    className="h-16 text-lg border-2 border-slate-200 focus:border-indigo-500 rounded-xl font-mono"
                  />
                </div>
                <Button type="submit" className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg rounded-xl">
                  Add Serial <Hash className="h-5 w-5 ml-2" />
                </Button>
              </form>

              {currentSerials.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Scanned Serials ({currentSerials.length})</p>
                  {currentSerials.map((serial, idx) => (
                    <div key={idx} className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 font-mono text-sm font-semibold text-slate-900">
                      {serial}
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-6" />
              <Button 
                onClick={finishCurrentItem} 
                className="w-full h-14 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white text-base font-semibold rounded-xl shadow-lg"
                disabled={currentSerials.length === 0}
              >
                Done with this item <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <Card className="card-modern border-0 shadow-xl animate-slide-up">
            <CardContent className="pt-16 pb-16 text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Receiving Complete!</h2>
              <p className="text-slate-600 mb-8 text-lg">
                Successfully received <span className="font-bold text-slate-900">{scannedItems.length}</span> item(s) from order <span className="font-bold text-slate-900">{purchaseOrder?.order_number}</span>
              </p>
              <Button onClick={reset} className="h-14 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg rounded-xl">
                Receive Another Order <Package className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}