import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Transactions() {
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await base44.entities.Transactions.list({ limit: 100 });
      return Array.isArray(response) ? response : [];
    },
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1>Transactions</h1>
      <p>Total Transactions: {transactions.length}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        View all transactions here.
      </p>
    </div>
  );
}
