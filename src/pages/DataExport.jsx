import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileSpreadsheet, Package, ShoppingCart, Upload, FileText, CreditCard, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DATA_TYPES = [
  { id: 'inventory', name: 'Inventory', icon: Package, entity: 'InventoryItem' },
  { id: 'products', name: 'Products', icon: ShoppingCart, entity: 'Product' },
  { id: 'purchaseOrders', name: 'Purchase Orders', icon: ShoppingCart, entity: 'PurchaseOrder' },
  { id: 'exports', name: 'Exports', icon: Upload, entity: 'Export' },
  { id: 'invoices', name: 'Invoices', icon: FileText, entity: 'Invoice' },
  { id: 'giftCards', name: 'Gift Cards', icon: CreditCard, entity: 'GiftCard' },
  { id: 'activity', name: 'Activity Log', icon: Activity, entity: 'ActivityLog' }
];

export default function DataExport() {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [exporting, setExporting] = useState(false);

  const toggleType = (id) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTypes(DATA_TYPES.map(t => t.id));
  };

  const clearAll = () => {
    setSelectedTypes([]);
  };

  const convertToCSV = (data, filename) => {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let cell = row[header];
          if (cell === null || cell === undefined) cell = '';
          if (typeof cell === 'object') cell = JSON.stringify(cell);
          cell = String(cell).replace(/"/g, '""');
          return `"${cell}"`;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    setExporting(true);
    
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
      let exported = 0;

      for (const typeId of selectedTypes) {
        const dataType = DATA_TYPES.find(t => t.id === typeId);
        if (!dataType) continue;

        try {
          const data = await base44.entities[dataType.entity].list('-created_date');
          
          // Filter by date range if needed
          let filteredData = data;
          if (dateRange !== 'all') {
            const daysAgo = parseInt(dateRange);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
            filteredData = data.filter(item => 
              new Date(item.created_date) >= cutoffDate
            );
          }

          if (filteredData.length > 0) {
            const csv = convertToCSV(filteredData, dataType.name);
            if (csv) {
              downloadCSV(csv, `${dataType.id}_${timestamp}.csv`);
              exported++;
            }
          }
        } catch (error) {
          console.error(`Error exporting ${dataType.name}:`, error);
        }
      }

      if (exported > 0) {
        toast.success(`Exported ${exported} file(s) successfully`);
        await logActivity('Exported data', 'other', `Exported ${selectedTypes.join(', ')}`);
      } else {
        toast.info('No data to export for the selected criteria');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('An error occurred during export');
    } finally {
      setExporting(false);
    }
  };

  const logActivity = async (action, entityType, details) => {
    const user = await base44.auth.me();
    await base44.entities.ActivityLog.create({
      action,
      entity_type: entityType,
      details,
      user_name: user.full_name,
      user_email: user.email
    });
  };

  return (
    <div>
      <PageHeader 
        title="Data Export" 
        description="Export your data to CSV files"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Select Data to Export</CardTitle>
                  <CardDescription>Choose which data types you want to export</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DATA_TYPES.map(dataType => (
                  <div
                    key={dataType.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTypes.includes(dataType.id) 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => toggleType(dataType.id)}
                  >
                    <Checkbox checked={selectedTypes.includes(dataType.id)} />
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <dataType.icon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium">{dataType.name}</p>
                      <p className="text-sm text-slate-500">Export as CSV</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleExport}
                  disabled={selectedTypes.length === 0 || exporting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : `Export ${selectedTypes.length} File(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="text-sm text-slate-500">
                  <p>Files will be exported as CSV format, which can be opened in Excel, Google Sheets, or any spreadsheet application.</p>
                  <p className="mt-2">Each data type will be exported as a separate file.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}