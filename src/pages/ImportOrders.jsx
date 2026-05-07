import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function ImportOrders() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    setIsLoading(true);
    try {
      // Import logic here
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Import Orders</h1>
      <button
        onClick={handleImport}
        disabled={isLoading}
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--color-text-info)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Importing...' : 'Import Orders'}
      </button>
    </div>
  );
}
