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
            // Create shipment record (ParcelsApp tracks automatically)
            try {
              await base44.entities.Shipment.create({
                purchase_order_id: order.id,
                order_number: order.order_number,
                tracking_number: order.tracking_number,
                carrier: order.carrier || 'auto-detected',
                status: 'tracking',
                last_update: new Date().toISOString()
              });
              
              toast.success(`Tracking registered: ${order.tracking_number}`);
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