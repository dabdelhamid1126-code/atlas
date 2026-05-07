import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ImageOff, AlertCircle, Edit2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import base44 from '../api/base44Client';
import Layout from '../lib/Layout';
import { formatCurrency, formatDate } from '../lib/utils';

// ============================================
// ISSUE #1 FIX: SECURE LOGO FUNCTION
// ============================================
// Gets logo from BACKEND which uses Base44 Secrets
// API key is NEVER exposed to frontend!
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

// Brand logo component
function BrandLogo({ domain, size = 18 }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [err, setErr] = useState(false);
  
  useEffect(() => {
    if (!domain) return;
    
    getBrandLogoUrl(domain)
      .then(url => {
        if (url) setLogoUrl(url);
      })
      .catch(() => setErr(true));
  }, [domain]);
  
  if (!logoUrl || err) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: '4px',
      }}>
        <ImageOff size={size - 4} />
      </div>
    );
  }
  
  return (
    <img 
      src={logoUrl} 
      alt={domain}
      style={{
        width: size,
        height: size,
        borderRadius: '4px',
        objectFit: 'contain',
      }}
      onError={() => setErr(true)}
    />
  );
}

// Form modal
function OrderFormModal({ isOpen, onClose, onSave, initialData, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    order_type: 'churning',
    retailer: '',
    order_number: '',
    total_cost: 0,
    final_cost: 0,
    status: 'new',
    bonus_notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('cost') ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate final_cost <= total_cost (ISSUE #1 FIX)
    if (formData.final_cost > formData.total_cost) {
      alert('Final cost cannot exceed total cost');
      return;
    }
    
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--color-background-primary)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>
          {initialData ? 'Edit Order' : 'New Order'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Order Type
            </label>
            <select
              name="order_type"
              value={formData.order_type}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="churning">Churning</option>
              <option value="marketplace">Marketplace</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Retailer *
            </label>
            <input
              type="text"
              name="retailer"
              value={formData.retailer}
              onChange={handleChange}
              placeholder="e.g., Amazon"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Order Number *
            </label>
            <input
              type="text"
              name="order_number"
              value={formData.order_number}
              onChange={handleChange}
              placeholder="e.g., AMZ-123456"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Total Cost *
            </label>
            <input
              type="number"
              name="total_cost"
              value={formData.total_cost}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Final Cost *
            </label>
            <input
              type="number"
              name="final_cost"
              value={formData.final_cost}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid var(--color-border-secondary)',
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: 'var(--color-text-info)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main page
export default function NewOrders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: allOrders = [], isLoading, error } = useQuery({
    queryKey: ['purchaseOrders', { status: 'all' }],
    queryFn: async () => {
      try {
        const response = await base44.entities.PurchaseOrder.list({ limit: 500 });
        return Array.isArray(response) ? response : [];
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter orders
  const orders = useMemo(() => {
    return allOrders.filter(o =>
      o.retailer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allOrders, searchTerm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      if (formData.final_cost > formData.total_cost) {
        throw new Error('Final cost cannot exceed total cost');
      }
      return await base44.entities.PurchaseOrder.create({
        ...formData,
        status: 'new',
        created_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      if (formData.final_cost > formData.total_cost) {
        throw new Error('Final cost cannot exceed total cost');
      }
      return await base44.entities.PurchaseOrder.update(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setEditingId(null);
      setIsModalOpen(false);
    },
  });

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

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ margin: 0 }}>New Orders</h1>
          <button
            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--color-text-info)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} /> Add Order
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

        <div style={{ marginBottom: '24px' }}>
          <Search size={16} style={{ position: 'absolute', marginLeft: '12px', marginTop: '10px', color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)' }}>
            Loading...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)' }}>
            No orders
          </div>
        ) : (
          <div style={{ borderRadius: '8px', border: '1px solid var(--color-border-tertiary)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ backgroundColor: 'var(--color-background-secondary)', borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Logo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Retailer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Order #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Total Cost</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Final Cost</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <BrandLogo domain={order.retailer} size={32} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>{order.retailer}</td>
                    <td style={{ padding: '12px 16px' }}>{order.order_number}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(order.total_cost || 0)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(order.final_cost || 0)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatDate(order.created_date)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => { setEditingId(order.id); setIsModalOpen(true); }}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--color-text-info)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(order.id); }}
                        style={{
                          padding: '6px 10px',
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
      </div>

      <OrderFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingId(null); }}
        onSave={handleSave}
        initialData={editingId ? allOrders.find(o => o.id === editingId) : null}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Layout>
  );
}        if (url) setLogoUrl(url);
      })
      .catch(() => setErr(true));
  }, [domain]);
  
  if (!logoUrl || err) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: '4px',
        color: 'var(--color-text-secondary)',
      }}>
        <ImageOff size={size - 4} />
      </div>
    );
  }
  
  return (
    <img 
      src={logoUrl} 
      alt={domain}
      style={{
        width: size,
        height: size,
        borderRadius: '4px',
        objectFit: 'contain',
      }}
      onError={() => setErr(true)}
    />
  );
}

// ============================================
// FORM MODAL COMPONENT
// ============================================
// Modal for creating/editing orders
function OrderFormModal({ isOpen, onClose, onSave, initialData, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    order_type: 'churning',
    retailer: '',
    order_number: '',
    total_cost: 0,
    final_cost: 0,
    status: 'new',
    bonus_notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('cost') ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate that final_cost <= total_cost
    if (formData.final_cost > formData.total_cost) {
      alert('Final cost cannot exceed total cost');
      return;
    }
    
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--color-background-primary)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>
          {initialData ? 'Edit Order' : 'New Order'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Order Type */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Order Type
            </label>
            <select
              name="order_type"
              value={formData.order_type}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="churning">Churning</option>
              <option value="marketplace">Marketplace</option>
            </select>
          </div>

          {/* Retailer */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Retailer *
            </label>
            <input
              type="text"
              name="retailer"
              value={formData.retailer}
              onChange={handleChange}
              placeholder="e.g., Amazon, Best Buy"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Order Number */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Order Number *
            </label>
            <input
              type="text"
              name="order_number"
              value={formData.order_number}
              onChange={handleChange}
              placeholder="e.g., AMZ-123456"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Total Cost */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Total Cost *
            </label>
            <input
              type="number"
              name="total_cost"
              value={formData.total_cost}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Final Cost */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Final Cost (after discounts) *
            </label>
            <input
              type="number"
              name="final_cost"
              value={formData.final_cost}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
            <small style={{ color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
              Must be ≤ total cost
            </small>
          </div>

          {/* Bonus Notes */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Bonus Notes
            </label>
            <textarea
              name="bonus_notes"
              value={formData.bonus_notes}
              onChange={handleChange}
              placeholder="e.g., 5% cashback, free shipping"
              rows="3"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid var(--color-border-secondary)',
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: 'var(--color-text-info)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MAIN NEW ORDERS PAGE
// ============================================
export default function NewOrders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sortField, setSortField] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // ============================================
  // FETCH ORDERS
  // ============================================
  const { data: allOrders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['purchaseOrders', { status: 'all' }],
    queryFn: async () => {
      try {
        const response = await base44.entities.PurchaseOrder.list({
          limit: 500,
          sort_by: '-created_date',
        });
        return Array.isArray(response) ? response : [];
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  // ============================================
  // FILTER AND SORT ORDERS
  // ============================================
  const orders = useMemo(() => {
    let filtered = allOrders;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.retailer.toLowerCase().includes(term) ||
        o.order_number.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle numeric values
      if (typeof aVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle string/date values
      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return filtered;
  }, [allOrders, sortField, sortOrder, filterStatus, searchTerm]);

  // ============================================
  // MUTATIONS
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      // Validate final_cost <= total_cost
      if (formData.final_cost > formData.total_cost) {
        throw new Error('Final cost cannot exceed total cost');
      }

      const result = await base44.entities.PurchaseOrder.create({
        ...formData,
        status: 'new',
        created_date: new Date().toISOString(),
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setIsModalOpen(false);
    },
    onError: (error) => {
      alert(`Failed to create order: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      // Validate final_cost <= total_cost
      if (formData.final_cost > formData.total_cost) {
        throw new Error('Final cost cannot exceed total cost');
      }

      const result = await base44.entities.PurchaseOrder.update(id, formData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setEditingId(null);
      setIsModalOpen(false);
    },
    onError: (error) => {
      alert(`Failed to update order: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.PurchaseOrder.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
    onError: (error) => {
      alert(`Failed to delete order: ${error.message}`);
    },
  });

  // ============================================
  // HANDLERS
  // ============================================
  const handleAddNew = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (order) => {
    setEditingId(order.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = (formData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <Layout>
      <div style={{
        padding: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '8px' }}>New Orders</h1>
            <p style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleAddNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--color-text-info)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            <Plus size={18} /> Add Order
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-background-danger)',
            color: 'var(--color-text-danger)',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <AlertCircle size={16} />
            Failed to load orders. Please try again.
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)',
              }}
            />
            <input
              type="text"
              placeholder="Search by retailer or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--color-text-secondary)',
          }}>
            Loading orders...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--color-text-secondary)',
          }}>
            {allOrders.length === 0 ? 'No orders yet' : 'No matching orders'}
          </div>
        )}

        {/* Orders Table */}
        {!isLoading && orders.length > 0 && (
          <div style={{
            borderRadius: '8px',
            border: '1px solid var(--color-border-tertiary)',
            overflowX: 'auto',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
              <thead style={{
                backgroundColor: 'var(--color-background-secondary)',
                borderBottom: '1px solid var(--color-border-tertiary)',
              }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Logo</th>
                  <th
                    onClick={() => handleSort('retailer')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '500',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Retailer {sortField === 'retailer' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('order_number')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '500',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Order # {sortField === 'order_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('total_cost')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '500',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Total Cost {sortField === 'total_cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('final_cost')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '500',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Final Cost {sortField === 'final_cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Status</th>
                  <th
                    onClick={() => handleSort('created_date')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '500',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Date {sortField === 'created_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-tertiary)',
                      '&:hover': { backgroundColor: 'var(--color-background-secondary)' },
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <BrandLogo domain={order.retailer} size={32} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>{order.retailer}</td>
                    <td style={{ padding: '12px 16px' }}>{order.order_number}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {formatCurrency(order.total_cost || 0)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {formatCurrency(order.final_cost || 0)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: order.status === 'completed'
                          ? 'var(--color-background-success)'
                          : order.status === 'cancelled'
                          ? 'var(--color-background-danger)'
                          : 'var(--color-background-info)',
                        color: order.status === 'completed'
                          ? 'var(--color-text-success)'
                          : order.status === 'cancelled'
                          ? 'var(--color-text-danger)'
                          : 'var(--color-text-info)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'capitalize',
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {formatDate(order.created_date)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(order)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: 'var(--color-text-info)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: 'var(--color-text-danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
        }}
        onSave={handleSave}
        initialData={editingId ? allOrders.find(o => o.id === editingId) : null}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Layout>
  );
}
