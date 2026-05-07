import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Rewards() {
  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const response = await base44.entities.Reward.list({ limit: 100 });
      return Array.isArray(response) ? response : [];
    },
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1>Rewards</h1>
      <p>Total Rewards: {rewards.length}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Track your rewards and cashback here.
      </p>
    </div>
  );
}
