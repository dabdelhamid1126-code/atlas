import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, X, Check, FileText, DollarSign, Search, Eye, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

export default function Invoices() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [productSearches, setProductSearches] = useState({});
  const [viewInvoice, setViewInvoice] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    buyer: '',
    buyer_email: '',
    buyer_address: '',
    status: 'draft',
    invoice_date: '',
    due_date: '',
    items: [],
    tax: 0,
    notes: ''
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
      setDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
      setDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    }
  });

  const togglePaidStatus = async (invoice) => {
    const newStatus = invoice.status === 'paid' ? 'sent' : 'paid';
    
    // If marking as paid from non-sold status, deduct inventory
    if (newStatus === 'paid' && !['sent', 'paid'].includes(invoice.status)) {
      const canDeduct = invoice.items.every(item => {
        if (item.product_id) {
          const available = getAvailableStock(item.product_id);
          return available >= item.quantity;
        }
        return true;
      });
      
      if (!canDeduct) {
        toast.error('Insufficient stock to mark as paid');
        return;
      }
      
      await deductInventory(invoice.items);
    }
    
    await base44.entities.Invoice.update(invoice.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    toast.success(`Invoice marked as ${newStatus}`);
  };

  const handleDelete = (invoice) => {
    if (confirm(`Are you sure you want to delete invoice #${invoice.invoice_number}?`)) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const openDialog = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoice_number: invoice.invoice_number || '',
        buyer: invoice.buyer || '',
        buyer_email: invoice.buyer_email || '',
        buyer_address: invoice.buyer_address || '',
        status: invoice.status || 'draft',
        invoice_date: invoice.invoice_date || '',
        due_date: invoice.due_date || '',
        items: invoice.items || [],
        tax: invoice.tax || 0,
        notes: invoice.notes || ''
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        invoice_number: '',
        buyer: '',
        buyer_email: '',
        buyer_address: '',
        status: 'draft',
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: '',
        items: [{ product_id: '', description: '', quantity: 1, unit_price: 0, total: 0 }],
        tax: 0,
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', description: '', quantity: 1, unit_price: 0, unit_cost: 0, total: 0 }]
    });
  };

  const selectProduct = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Calculate weighted average cost from all purchase orders
      const productOrders = purchaseOrders.filter(po => po.items?.some(i => i.product_id === productId));
      
      let unitCost = 0;
      if (productOrders.length > 0) {
        let totalCost = 0;
        let totalQuantity = 0;
        
        productOrders.forEach(po => {
          const orderItem = po.items.find(i => i.product_id === productId);
          if (orderItem && orderItem.unit_cost && orderItem.quantity_ordered) {
            totalCost += orderItem.unit_cost * orderItem.quantity_ordered;
            totalQuantity += orderItem.quantity_ordered;
          }
        });
        
        if (totalQuantity > 0) {
          unitCost = totalCost / totalQuantity;
        }
      }
      
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        description: product.name,
        unit_price: product.price || 0,
        unit_cost: unitCost,
        total: (newItems[index].quantity || 1) * (product.price || 0)
      };
      setFormData({ ...formData, items: newItems });
    }
  };

  const getAvailableStock = (productId) => {
    if (!productId) return 0;
    return inventory
      .filter(inv => inv.product_id === productId && inv.status === 'in_stock')
      .reduce((sum, inv) => sum + (inv.quantity || 0), 0);
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = formData.tax || 0;
    const total = subtotal + tax;
    return { subtotal, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_number.trim()) {
      toast.error('Invoice number is required');
      return;
    }

    // Check stock availability if status is 'sent' or 'paid'
    const isSoldStatus = ['sent', 'paid'].includes(formData.status);
    const wasNotSold = editingInvoice && !['sent', 'paid'].includes(editingInvoice.status);
    
    if (isSoldStatus && (!editingInvoice || wasNotSold)) {
      for (const item of formData.items) {
        if (item.product_id) {
          const available = getAvailableStock(item.product_id);
          if (available < item.quantity) {
            toast.error(`Insufficient stock for ${item.description}. Available: ${available}`);
            return;
          }
        }
      }
    }

    const { subtotal, total } = calculateTotals();
    const data = {
      ...formData,
      subtotal,
      total
    };

    if (editingInvoice) {
      // If changing from draft/cancelled to sent/paid, deduct inventory
      const wasNotSold = !['sent', 'paid'].includes(editingInvoice.status);
      const isNowSold = ['sent', 'paid'].includes(data.status);
      
      if (wasNotSold && isNowSold) {
        await deductInventory(data.items);
      }
      await updateMutation.mutateAsync({ id: editingInvoice.id, data });
    } else {
      // Deduct inventory if creating as 'sent' or 'paid'
      if (['sent', 'paid'].includes(formData.status)) {
        await deductInventory(formData.items);
      }
      createMutation.mutate(data);
    }
  };

  const deductInventory = async (items) => {
    for (const item of items) {
      if (item.product_id) {
        const productInventory = inventory.filter(
          inv => inv.product_id === item.product_id && inv.status === 'in_stock'
        ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        let remaining = item.quantity;
        for (const inv of productInventory) {
          if (remaining <= 0) break;
          
          const deductAmount = Math.min(inv.quantity, remaining);
          const newQuantity = inv.quantity - deductAmount;
          
          if (newQuantity > 0) {
            await base44.entities.InventoryItem.update(inv.id, { quantity: newQuantity });
          } else {
            await base44.entities.InventoryItem.update(inv.id, { quantity: 0, status: 'exported' });
          }
          
          remaining -= deductAmount;
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const downloadPDF = async (invoice) => {
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '800px';
    pdfContent.style.padding = '40px';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    
    pdfContent.innerHTML = `
      <div style="margin-bottom: 40px;">
        <h1 style="font-size: 32px; font-weight: bold; margin: 0;">INVOICE</h1>
        <p style="color: #666; margin: 5px 0;">#${invoice.invoice_number}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p style="margin: 5px 0;"><strong>Bill To:</strong></p>
        <p style="margin: 5px 0;">${invoice.buyer}</p>
        ${invoice.buyer_email ? `<p style="margin: 5px 0;">${invoice.buyer_email}</p>` : ''}
        ${invoice.buyer_address ? `<p style="margin: 5px 0;">${invoice.buyer_address}</p>` : ''}
      </div>

      <div style="margin-bottom: 30px;">
        <p style="margin: 5px 0;"><strong>Date:</strong> ${invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
            <th style="padding: 12px; text-align: left;">Description</th>
            <th style="padding: 12px; text-align: center;">Quantity</th>
            <th style="padding: 12px; text-align: right;">Unit Price</th>
            <th style="padding: 12px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map(item => `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 12px;">${item.description}</td>
              <td style="padding: 12px; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; text-align: right;">$${(item.unit_price || 0).toFixed(2)}</td>
              <td style="padding: 12px; text-align: right;">$${(item.total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="text-align: right; margin-bottom: 30px;">
        <p style="margin: 8px 0;"><strong>Subtotal:</strong> $${(invoice.subtotal || 0).toFixed(2)}</p>
        <p style="margin: 8px 0;"><strong>Tax:</strong> $${(invoice.tax || 0).toFixed(2)}</p>
        <p style="margin: 8px 0; font-size: 20px; font-weight: bold;"><strong>Total:</strong> $${(invoice.total || 0).toFixed(2)}</p>
      </div>

      ${invoice.notes ? `<div><p style="margin: 5px 0;"><strong>Notes:</strong></p><p style="margin: 5px 0; color: #666;">${invoice.notes}</p></div>` : ''}
    `;
    
    document.body.appendChild(pdfContent);
    const canvas = await html2canvas(pdfContent);
    document.body.removeChild(pdfContent);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`invoice-${invoice.invoice_number}.pdf`);
    toast.success('Invoice downloaded');
  };

  const calculateInvoiceProfit = (invoice) => {
    let totalCost = 0;
    const itemsWithProfit = (invoice.items || []).map(item => {
      // Use stored unit_cost if available, otherwise calculate weighted average from purchase orders
      let unitCost = item.unit_cost || 0;
      
      if (!unitCost && item.product_id) {
        // Calculate weighted average cost from all purchase orders
        const productOrders = purchaseOrders.filter(po => po.items?.some(i => i.product_id === item.product_id));
        
        if (productOrders.length > 0) {
          let totalOrderCost = 0;
          let totalQuantity = 0;
          
          productOrders.forEach(po => {
            const orderItem = po.items.find(i => i.product_id === item.product_id);
            if (orderItem && orderItem.unit_cost && orderItem.quantity_ordered) {
              totalOrderCost += orderItem.unit_cost * orderItem.quantity_ordered;
              totalQuantity += orderItem.quantity_ordered;
            }
          });
          
          if (totalQuantity > 0) {
            unitCost = totalOrderCost / totalQuantity;
          }
        }
      }
      
      const itemCost = unitCost * item.quantity;
      totalCost += itemCost;
      const itemRevenue = item.total || 0;
      const itemProfit = itemRevenue - itemCost;
      const itemProfitMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
      
      return {
        ...item,
        cost: itemCost,
        profit: itemProfit,
        profitMargin: itemProfitMargin
      };
    });
    
    const revenue = invoice.total || 0;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return { totalCost, profit, profitMargin, itemsWithProfit };
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file: importFile });

      // Extract data from file
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            invoices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  invoice_number: { type: 'string' },
                  buyer: { type: 'string' },
                  buyer_email: { type: 'string' },
                  buyer_address: { type: 'string' },
                  invoice_date: { type: 'string' },
                  due_date: { type: 'string' },
                  status: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unit_price: { type: 'number' }
                      }
                    }
                  },
                  tax: { type: 'number' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (result.status === 'error') {
        toast.error(result.details || 'Failed to extract data from file');
        setImporting(false);
        return;
      }

      const invoicesToCreate = result.output?.invoices || [];
      
      if (invoicesToCreate.length === 0) {
        toast.error('No invoices found in file');
        setImporting(false);
        return;
      }

      // Create invoices
      for (const inv of invoicesToCreate) {
        const items = (inv.items || []).map(item => ({
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0)
        }));

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal + (inv.tax || 0);

        await base44.entities.Invoice.create({
          invoice_number: inv.invoice_number,
          buyer: inv.buyer,
          buyer_email: inv.buyer_email || '',
          buyer_address: inv.buyer_address || '',
          invoice_date: inv.invoice_date || format(new Date(), 'yyyy-MM-dd'),
          due_date: inv.due_date || '',
          status: inv.status || 'draft',
          items,
          subtotal,
          tax: inv.tax || 0,
          total,
          notes: inv.notes || ''
        });
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Successfully imported ${invoicesToCreate.length} invoice(s)`);
      setImportOpen(false);
      setImportFile(null);
    } catch (error) {
      toast.error('Failed to import invoices');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');

  const totalProfit = paidInvoices.reduce((sum, inv) => sum + calculateInvoiceProfit(inv).profit, 0);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Invoices</h1>
        <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Manage and track invoices</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'flex-end' }}>
        <Button onClick={() => setImportOpen(true)} variant="outline">
          <Upload className="h-4 w-4 mr-2" /> Import
        </Button>
        <Button onClick={() => openDialog()} style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'var(--ocean)', icon: FileText },
          { label: 'Paid', value: `$${paidInvoices.reduce((s,i) => s+(i.total||0),0).toLocaleString()}`, color: 'var(--terrain)', icon: Check },
          { label: 'Unpaid', value: `$${unpaidInvoices.reduce((s,i) => s+(i.total||0),0).toLocaleString()}`, color: 'var(--gold)', icon: DollarSign },
          { label: 'Total Profit', value: `$${totalProfit.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: 'var(--terrain)', icon: DollarSign },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 18, borderTop: `3px solid ${s.color}` }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: s.color, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontFamily: "'Cinzel',serif", fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="unpaid" className="w-full">
        <TabsList className="glass mb-6">
          <TabsTrigger value="unpaid" className="data-[state=active]:bg-white">
            Unpaid ({unpaidInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:bg-white">
            Paid ({paidInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unpaid" className="space-y-4">
          {unpaidInvoices.map((inv) => (
            <Card key={inv.id} className="card-modern p-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-lg font-bold" style={{ color: 'var(--ink)' }}>#{inv.invoice_number}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-medium" style={{ color: 'var(--ink-dim)' }}>{inv.buyer}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ink-faded)' }}>
                    Due: {inv.due_date ? format(new Date(inv.due_date), 'MMM dd, yyyy') : 'No due date'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>${(inv.total || 0).toFixed(2)}</p>
                  </div>
                  <Button onClick={() => setViewInvoice(inv)} variant="outline" size="icon" title="View Invoice">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => togglePaidStatus(inv)} style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
                    <Check className="h-4 w-4 mr-2" /> Mark Paid
                  </Button>
                  <Button onClick={() => downloadPDF(inv)} variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openDialog(inv)} variant="outline">
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(inv)} variant="outline" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {unpaidInvoices.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No unpaid invoices</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidInvoices.map((inv) => (
            <Card key={inv.id} className="card-modern p-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-lg font-bold" style={{ color: 'var(--ink)' }}>#{inv.invoice_number}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      PAID
                    </span>
                  </div>
                  <p className="font-medium" style={{ color: 'var(--ink-dim)' }}>{inv.buyer}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ink-faded)' }}>
                    Paid on: {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM dd, yyyy') : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-2xl font-bold text-emerald-600">${(inv.total || 0).toFixed(2)}</p>
                    {(() => {
                      const { profit, profitMargin } = calculateInvoiceProfit(inv);
                      return (
                        <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                          Profit: <span className={profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            ${profit.toFixed(2)}
                          </span> ({profitMargin.toFixed(1)}%)
                        </p>
                      );
                    })()}
                  </div>
                  <Button onClick={() => setViewInvoice(inv)} variant="outline" size="icon" title="View Invoice">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => togglePaidStatus(inv)} variant="outline">
                    Mark Unpaid
                  </Button>
                  <Button onClick={() => downloadPDF(inv)} variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openDialog(inv)} variant="outline">
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(inv)} variant="outline" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {paidInvoices.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Check className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No paid invoices</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Invoice Number *</Label>
                <Input 
                  value={formData.invoice_number} 
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="INV-001"
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Buyer Name *</Label>
              <Input
                value={formData.buyer}
                onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                required
                placeholder="Company or individual name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Buyer Email</Label>
                <Input
                  type="email"
                  value={formData.buyer_email}
                  onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                  placeholder="buyer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Buyer Address</Label>
                <Input
                  value={formData.buyer_address}
                  onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Invoice Date</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const availableStock = item.product_id ? getAvailableStock(item.product_id) : null;
                  const currentSearch = productSearches[index] || '';
                  const filteredProducts = products.filter(p => 
                    !currentSearch || 
                    p.name?.toLowerCase().includes(currentSearch.toLowerCase()) ||
                    p.upc?.toLowerCase().includes(currentSearch.toLowerCase())
                  );
                  return (
                    <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Label className="text-xs font-medium">Product</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              value={currentSearch}
                              onChange={(e) => setProductSearches({...productSearches, [index]: e.target.value})}
                              placeholder="Search products..."
                              className="pl-9 mb-2"
                            />
                          </div>
                          <Select 
                            value={item.description || ''} 
                            onValueChange={(v) => {
                              const product = products.find(p => p.name === v);
                              if (product) selectProduct(index, product.id);
                              setProductSearches({...productSearches, [index]: ''});
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProducts.length === 0 ? (
                                <div className="p-2 text-sm text-slate-500 text-center">No products found</div>
                              ) : (
                                filteredProducts.map(p => (
                                  <SelectItem key={p.id} value={p.name}>
                                    {p.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {item.unit_cost !== undefined && item.unit_cost > 0 && (
                            <p className="text-xs text-slate-600 mt-1">
                              Cost: ${item.unit_cost.toFixed(2)} • Margin: {item.unit_price > 0 ? ((1 - item.unit_cost / item.unit_price) * 100).toFixed(1) : 0}%
                            </p>
                          )}
                        </div>
                        <div className="w-24">
                          <Label className="text-xs font-medium">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-xs font-medium">Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="w-32 text-right">
                          <Label className="text-xs font-medium">Total</Label>
                          <p className="font-semibold py-2 text-lg">${(item.total || 0).toFixed(2)}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {availableStock !== null && (
                          <>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              availableStock >= item.quantity 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {availableStock} in stock
                            </div>
                            {availableStock < item.quantity && (
                              <span className="text-xs text-red-600 font-medium">Insufficient stock!</span>
                            )}
                          </>
                        )}
                        {item.unit_cost !== undefined && item.unit_cost > 0 && item.total > 0 && (
                          <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Profit: ${((item.total || 0) - (item.unit_cost * item.quantity)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl space-y-3 border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold">${calculateTotals().subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Tax</span>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  className="w-32"
                />
              </div>
              <div className="flex justify-between font-bold text-xl pt-3 border-t-2 border-slate-300">
                <span>Total</span>
                <span style={{ color: 'var(--terrain)' }}>${calculateTotals().total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Payment terms, thank you message, etc."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
                {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Invoices</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
              <p className="font-semibold mb-2">Supported formats: CSV, Excel, JSON, PDF</p>
              <p className="text-xs text-slate-600 mb-2">Your file should include:</p>
              <ul className="text-xs text-slate-600 space-y-1 ml-4 list-disc">
                <li>invoice_number (required)</li>
                <li>buyer (required)</li>
                <li>buyer_email, buyer_address (optional)</li>
                <li>invoice_date, due_date (optional)</li>
                <li>status (draft, sent, paid, overdue, cancelled)</li>
                <li>items array with: description, quantity, unit_price</li>
                <li>tax, notes (optional)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Select File</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.json,.pdf"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between">
              <span>Invoice #{viewInvoice?.invoice_number}</span>
              <Button onClick={() => downloadPDF(viewInvoice)} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-6 p-6 bg-white">
              <div className="flex justify-between items-start pb-6 border-b">
                <div>
                  <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>INVOICE</h1>
                  <p style={{ color: 'var(--ink-dim)' }}>#{viewInvoice.invoice_number}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  viewInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  viewInvoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  viewInvoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {viewInvoice.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-faded)' }}>BILL TO:</p>
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>{viewInvoice.buyer}</p>
                  {viewInvoice.buyer_email && <p className="text-slate-600">{viewInvoice.buyer_email}</p>}
                  {viewInvoice.buyer_address && <p className="text-slate-600">{viewInvoice.buyer_address}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Invoice Date:</span> {viewInvoice.invoice_date ? format(new Date(viewInvoice.invoice_date), 'MMM dd, yyyy') : '-'}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Due Date:</span> {viewInvoice.due_date ? format(new Date(viewInvoice.due_date), 'MMM dd, yyyy') : '-'}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</th>
                      {viewInvoice.status === 'paid' && (
                        <>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Cost</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Profit</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const { itemsWithProfit } = calculateInvoiceProfit(viewInvoice);
                      return itemsWithProfit.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-slate-900">{item.description}</td>
                          <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-700">${(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">${(item.total || 0).toFixed(2)}</td>
                          {viewInvoice.status === 'paid' && (
                            <>
                              <td className="px-4 py-3 text-right text-slate-600">${item.cost.toFixed(2)}</td>
                              <td className={`px-4 py-3 text-right font-semibold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ${item.profit.toFixed(2)} ({item.profitMargin.toFixed(1)}%)
                              </td>
                            </>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">${(viewInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Tax:</span>
                    <span className="font-medium">${(viewInvoice.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t-2">
                    <span>Total:</span>
                    <span>${(viewInvoice.total || 0).toFixed(2)}</span>
                  </div>
                  {viewInvoice.status === 'paid' && (() => {
                    const { totalCost, profit, profitMargin } = calculateInvoiceProfit(viewInvoice);
                    return (
                      <>
                        <div className="flex justify-between text-sm text-slate-600 pt-2 border-t">
                          <span>Cost:</span>
                          <span className="font-medium">${totalCost.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between text-lg font-bold pt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span>Profit:</span>
                          <span>${profit.toFixed(2)} ({profitMargin.toFixed(1)}%)</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {viewInvoice.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Notes:</p>
                  <p className="text-slate-600">{viewInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewInvoice(null)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}