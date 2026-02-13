import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TrackingAutomation() {
  useEffect(() => {
    // Subscribe to PurchaseOrder changes
    const unsubscribe = base44.entities.PurchaseOrder.subscribe(async (event) => {
      if (event.type === 'create' || event.type === 'update') {
        const order = event.data;
        
        // Check if tracking number exists and was just added
        if (order.tracking_number && order.tracking_number.trim()) {
          // Check if shipment already exists
          const existingShipments = await base44.entities.Shipment.filter({
            tracking_number: order.tracking_number
          });
          
          if (existingShipments.length === 0) {
            // Register with TrackingMore API
            try {
              const response = await fetch('https://api.trackingmore.com/v4/trackings/create', {
                method: 'POST',
                headers: {
                  'Tracking-Api-Key': '5d8ad0f7-6e93-4883-bbdd-e19d64e51e56',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  tracking_number: order.tracking_number,
                  carrier_code: 'auto'
                })
              });

              if (response.ok) {
                // Create shipment record
                await base44.entities.Shipment.create({
                  purchase_order_id: order.id,
                  order_number: order.order_number,
                  tracking_number: order.tracking_number,
                  carrier: 'auto-detected',
                  status: 'registered',
                  last_update: new Date().toISOString()
                });
                
                toast.success(`Tracking registered: ${order.tracking_number}`);
              }
            } catch (error) {
              console.error('Failed to register tracking:', error);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // This component doesn't render anything
}