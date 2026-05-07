import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Dashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      const response = await base44.entities.PurchaseOrder.list({ limit: 10 });
      return Array.isArray(response) ? response : [];
    },
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1>Dashboard</h1>
      <p>Total Orders: {orders.length}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Welcome to Atlas! Start by creating a new order.
      </p>
    </div>
  );
}
