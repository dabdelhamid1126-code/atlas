import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Invoices() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await base44.entities.Invoice.list({ limit: 100 });
      return Array.isArray(response) ? response : [];
    },
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1>Invoices</h1>
      <p>Total Invoices: {invoices.length}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Manage your invoices here.
      </p>
    </div>
  );
}
