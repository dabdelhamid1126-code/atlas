import { useState, useEffect } from 'react';
import { Plus, Trash2, ImageOff, AlertCircle, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import base44 from '../api/base44Client';
import Layout from '../components/Layout';
import POFormModal from '../components/POFormModal';
import { formatCurrency, formatDate } from '../lib/utils';

// Call backend function to get logo URL securely (no hardcoded API key!)
const getBrandLogoUrl = async (domain) => {
  if (!domain) return null;
  try {
    const result = await base44.functions.call('getBrandfetchLogo', { domain });
    return result?.logoUrl;
  } catch (error) {
    console.error('Failed to fetch logo:', error);
    return null;
  }
};

// Component that displays the logo
function BrandLogo({ domain, size = 18, fallback = '?' }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [err, setErr] = useState(false);
  
  useEffect(() => {
    if (!domain) return;
    
    getBrandLogoUrl(domain)
      .then(url => setLogoUrl(url))
      .catch(() => setErr(true));
  }, [domain]);
  
  if (!logoUrl || err) return <ImageOff size={size} />;
  
  return (
    <img 
      src={logoUrl} 
      alt={domain} 
      style={{ width: size, height: size }} 
      onError={() => setErr(true)}
    />
  );
}

export default function NewOrders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch purchase orders
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['purchaseOrders', { status: 'pending' }],
    queryFn: async () => {
      try {
        const response = await base44.entities.PurchaseOrder.list({
          q: JSON.stringify({ status: 'new' }),
          limit: 100,
        });
        return response || [];
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const result = await base44.entities.PurchaseOrder.create(formData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setIsModalOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      const result = await base44.entities.PurchaseOrder.update(id, formData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setEditingId(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.PurchaseOrder.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const handleSave = (formData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this order?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (order) => {
    setEditingId(order.id);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h1>New Orders</h1>
          <button
            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-text-info)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add Order
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-background-danger)',
            color: 'var(--color-text-danger)',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            Failed to load orders
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : orders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--color-text-secondary)',
          }}>
            No orders yet
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            borderRadius: '8px',
            border: '1px solid var(--color-border-tertiary)',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead style={{
                backgroundColor: 'var(--color-background-secondary)',
                borderBottom: '1px solid var(--color-border-tertiary)',
              }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>Logo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>Retailer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>Order #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>Total Cost</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-tertiary)',
                      '&:hover': { backgroundColor: 'var(--color-background-tertiary)' },
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <BrandLogo domain={order.retailer} size={24} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>{order.retailer}</td>
                    <td style={{ padding: '12px 16px' }}>{order.order_number}</td>
                    <td style={{ padding: '12px 16px' }}>{formatCurrency(order.total_cost)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatDate(order.created_date)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(order)}
                        style={{
                          padding: '4px 8px',
                          marginRight: '8px',
                          backgroundColor: 'var(--color-text-info)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'var(--color-text-danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <POFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingId ? orders.find(o => o.id === editingId) : null}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </Layout>
  );
}