import { useQuery } from '@tanstack/react-query';
import base44 from '../api/base44Client';

export default function Dashboard() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      try {
        const response = await base44.entities.PurchaseOrder.list({ limit: 10 });
        return Array.isArray(response) ? response : [];
      } catch (err) {
        console.error('Failed to fetch orders:', err);
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
          Dashboard
        </h1>
        <p style={{
          margin: '0',
          color: 'var(--color-text-secondary)',
          fontSize: '14px',
        }}>
          Welcome to Atlas
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {/* Total Orders Card */}
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
            Total Orders
          </p>
          <h2 style={{
            margin: '0',
            fontSize: '32px',
            color: 'var(--color-text-info)',
            fontWeight: '600',
          }}>
            {orders.length}
          </h2>
        </div>

        {/* Status Card */}
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
            Status
          </p>
          <h2 style={{
            margin: '0',
            fontSize: '18px',
            color: 'var(--color-text-success)',
            fontWeight: '600',
          }}>
            Online
          </h2>
        </div>

        {/* Last Updated Card */}
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
            Last Updated
          </p>
          <h2 style={{
            margin: '0',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
          }}>
            {new Date().toLocaleDateString()}
          </h2>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div>
        <h2 style={{
          marginBottom: '16px',
          color: 'var(--color-text-primary)',
          fontSize: '20px',
        }}>
          Recent Orders
        </h2>

        {isLoading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        ) : orders.length === 0 ? (
          <p style={{ 
            color: 'var(--color-text-secondary)',
            padding: '20px',
            backgroundColor: 'var(--parch-card)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            No orders yet. Start by creating a new order!
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
                    Order Number
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>
                    Retailer
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                    Cost
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: `1px solid var(--color-border-tertiary)`,
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>{order.order_number}</td>
                    <td style={{ padding: '12px 16px' }}>{order.retailer}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      ${order.total_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: order.status === 'completed' 
                          ? 'var(--color-background-success)'
                          : 'var(--color-background-info)',
                        color: order.status === 'completed'
                          ? 'var(--color-text-success)'
                          : 'var(--color-text-info)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'capitalize',
                      }}>
                        {order.status}
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