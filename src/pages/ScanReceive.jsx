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
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto">
        <PageHeader 
          title="Scan & Receive" 
          description="Scan tracking, UPC codes, and serial numbers"
        />

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'tracking' ? 'text-black' : 'text-gray-400'}`}>
              <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                step === 'tracking' ? 'border-black bg-black text-white' : 
                ['upc', 'serial', 'complete'].includes(step) ? 'border-black bg-black text-white' : 'border-gray-300'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Tracking</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'upc' ? 'text-black' : 'text-gray-400'}`}>
              <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                step === 'upc' ? 'border-black bg-black text-white' : 
                ['serial', 'complete'].includes(step) ? 'border-black bg-black text-white' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">UPC Scan</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
            <div className={`flex items-center gap-2 ${['serial', 'complete'].includes(step) ? 'text-black' : 'text-gray-400'}`}>
              <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                ['serial', 'complete'].includes(step) ? 'border-black bg-black text-white' : 'border-gray-300'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Tracking Number */}
        {step === 'tracking' && (
          <Card className="border-2 border-black">
            <CardHeader className="bg-black text-white">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Scan Tracking Number
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleTrackingScan} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tracking Number</Label>
                  <Input
                    ref={trackingInputRef}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Scan or enter tracking number"
                    className="h-14 text-lg border-2 border-gray-300 focus:border-black"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-black hover:bg-gray-800 text-white">
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: UPC Scanning */}
        {step === 'upc' && (
          <div className="space-y-6">
            <Card className="border-2 border-black">
              <CardHeader className="bg-black text-white">
                <CardTitle className="flex items-center gap-2">
                  <Barcode className="h-5 w-5" />
                  Scan UPC Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Order: {purchaseOrder?.order_number}</p>
                  <p className="text-sm text-gray-600">Supplier: {purchaseOrder?.supplier}</p>
                </div>
                <form onSubmit={handleUPCScan} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">UPC Code</Label>
                    <Input
                      ref={upcInputRef}
                      value={currentUPC}
                      onChange={(e) => setCurrentUPC(e.target.value)}
                      placeholder="Scan UPC barcode"
                      className="h-14 text-lg border-2 border-gray-300 focus:border-black"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-black hover:bg-gray-800 text-white">
                    Scan Item
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Scanned Items */}
            {scannedItems.length > 0 && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Scanned Items ({scannedItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scannedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.serial && <p className="text-sm text-gray-600 font-mono">{item.serial}</p>}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-black" />
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <Button onClick={completeReceiving} className="w-full bg-black hover:bg-gray-800 text-white">
                    Complete Receiving
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Serial Number Scanning */}
        {step === 'serial' && (
          <Card className="border-2 border-black">
            <CardHeader className="bg-black text-white">
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Scan Serial Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Current Item</p>
                <p className="text-sm text-gray-600">
                  {purchaseOrder?.items.find(i => i.upc === currentUPC)?.product_name}
                </p>
              </div>

              <form onSubmit={handleSerialScan} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Serial Number</Label>
                  <Input
                    ref={serialInputRef}
                    value={currentSerial}
                    onChange={(e) => setCurrentSerial(e.target.value)}
                    placeholder="Scan serial number"
                    className="h-14 text-lg border-2 border-gray-300 focus:border-black"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-black hover:bg-gray-800 text-white">
                  Add Serial
                </Button>
              </form>

              {currentSerials.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Scanned Serials ({currentSerials.length})</p>
                  {currentSerials.map((serial, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded font-mono text-sm">
                      {serial}
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-4" />
              <Button 
                onClick={finishCurrentItem} 
                variant="outline" 
                className="w-full border-2 border-black hover:bg-gray-100"
                disabled={currentSerials.length === 0}
              >
                Done with this item
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <Card className="border-2 border-black">
            <CardContent className="pt-12 pb-12 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-black" />
              <h2 className="text-2xl font-bold mb-2">Receiving Complete</h2>
              <p className="text-gray-600 mb-6">
                Successfully received {scannedItems.length} item(s) from order {purchaseOrder?.order_number}
              </p>
              <Button onClick={reset} className="bg-black hover:bg-gray-800 text-white">
                Receive Another Order
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}