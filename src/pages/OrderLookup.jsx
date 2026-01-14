import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Package, FileText, Upload, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderLookup() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const searchTerm = query.trim().toLowerCase();
      
      // Search across multiple entities
      const [purchaseOrders, exports, invoices] = await Promise.all([
        base44.entities.PurchaseOrder.list(),
        base44.entities.Export.list(),
        base44.entities.Invoice.list()
      ]);

      // Filter results
      const matchingPOs = purchaseOrders.filter(po => 
        po.order_number?.toLowerCase().includes(searchTerm) ||
        po.supplier?.toLowerCase().includes(searchTerm)
      );

      const matchingExports = exports.filter(exp => 
        exp.export_number?.toLowerCase().includes(searchTerm) ||
        exp.buyer?.toLowerCase().includes(searchTerm)
      );

      const matchingInvoices = invoices.filter(inv => 
        inv.invoice_number?.toLowerCase().includes(searchTerm) ||
        inv.buyer?.toLowerCase().includes(searchTerm)
      );

      if (matchingPOs.length === 0 && matchingExports.length === 0 && matchingInvoices.length === 0) {
        setError('No results found. Try searching by order number, export number, invoice number, supplier, or buyer name.');
      } else {
        setResults({
          purchaseOrders: matchingPOs,
          exports: matchingExports,
          invoices: matchingInvoices
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Order Lookup" 
        description="Search for orders, exports, and invoices"
      />

      {/* Search Form */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search by order #, export #, invoice #, supplier, or buyer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
            <Button 
              type="submit" 
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Purchase Orders */}
          {results.purchaseOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Purchase Orders ({results.purchaseOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.purchaseOrders.map(po => (
                    <div key={po.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-mono font-medium text-emerald-600">{po.order_number}</p>
                        <p className="text-sm text-slate-500">{po.supplier}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={po.status} />
                        <p className="text-sm text-slate-500 mt-1">
                          {po.order_date && format(new Date(po.order_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exports */}
          {results.exports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Exports ({results.exports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.exports.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-mono font-medium text-emerald-600">{exp.export_number}</p>
                        <p className="text-sm text-slate-500">{exp.buyer}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={exp.status} />
                        <p className="font-semibold mt-1">${exp.total_value?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoices ({results.invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-mono font-medium text-emerald-600">{inv.invoice_number}</p>
                        <p className="text-sm text-slate-500">{inv.buyer}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={inv.status} />
                        <p className="font-semibold mt-1">${inv.total?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!results && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="h-16 w-16 mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Search for Orders</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Enter an order number, export number, invoice number, supplier name, or buyer name to find related records.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}