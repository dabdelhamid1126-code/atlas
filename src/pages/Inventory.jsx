import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Inventory() {
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await base44.entities.InventoryItem.list({ limit: 100 });
      return Array.isArray(response) ? response : [];
    },
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1>Inventory</h1>
      <p>Total Items: {inventory.length}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Manage your inventory here.
      </p>
    </div>
  );
}
