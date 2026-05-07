import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Inventory() {
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      try {
        const response = await base44.entities.InventoryItem.list({ limit: 100 });
        return Array.isArray(response) ? response : [];
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        return [];
      }
    },
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0',
          color: 'var(--color-text-primary)',
          fontSize: '32px',
        }}>
          Inventory
        </h1>
        <p style={{
          margin: '0',
          color: 'var(--color-text-secondary)',
          fontSize: '14px',
        }}>
          Manage your inventory items
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--parch-card)',
          borderRadius: '8px',
          border: `1px solid var(--color-border-tertiary)`,
        }}>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
          }}>
            Total Items
          </p>
          <h2 style={{
            margin: '0',
            fontSize: '32px',
            color: 'var(--color-text-info)',
            fontWeight: '600',
          }}>
            {inventory.length}
          </h2>
        </div>
      </div>

      <div>
        <h2 style={{
          marginBottom: '16px',
          color: 'var(--color-text-primary)',
          fontSize: '20px',
        }}>
          Items
        </h2>

        {isLoading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        ) : inventory.length === 0 ? (
          <p style={{ 
            color: 'var(--color-text-secondary)',
            padding: '20px',
            backgroundColor: 'var(--parch-card)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            No inventory items yet
          </p>
        ) : (
          <div style={{
            borderRadius: '8px',
            border: `1px solid var(--color-border-tertiary)`,
            overflow: 'hidden',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
              <thead style={{
                backgroundColor: 'var(--parch-warm)',
                borderBottom: `1px solid var(--color-border-tertiary)`,
              }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>
                    SKU
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>
                    Product
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                    Quantity
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: `1px solid var(--color-border-tertiary)`,
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>{item.sku || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{item.product_name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {item.quantity || 0}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: item.status === 'in_stock'
                          ? 'var(--color-background-success)'
                          : 'var(--color-background-info)',
                        color: item.status === 'in_stock'
                          ? 'var(--color-text-success)'
                          : 'var(--color-text-info)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'capitalize',
                      }}>
                        {item.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}