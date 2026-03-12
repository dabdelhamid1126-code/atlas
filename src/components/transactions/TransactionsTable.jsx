import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, Eye, Download, Pencil, ArrowUpRight, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'date', label: 'DATE', width: '90px', sortable: true },
  { id: 'product', label: 'PRODUCT', width: '120px' },
  { id: 'vendor', label: 'VENDOR', width: '100px' },
  { id: 'platform', label: 'PLATFORM', width: '90px' },
  { id: 'qty', label: 'QTY', width: '50px' },
  { id: 'cost', label: 'COST', width: '90px' },
  { id: 'sale', label: 'SALE', width: '90px' },
  { id: 'profit', label: 'PROFIT', width: '80px' },
  { id: 'cashback', label: 'CASHBACK', width: '90px' },
  { id: 'orderNum', label: 'ORDER #', width: '100px' },
  { id: 'tracking', label: 'TRACKING #', width: '100px' },
  { id: 'payment', label: 'PAYMENT', width: '150px' },
  { id: 'status', label: 'STATUS', width: '100px' },
];

const ROWS_PER_PAGE = 10;

export default function TransactionsTable({ data = [], onEdit, onDelete, onExpand }) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState(COLUMNS.map(c => c.id));

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'date') {
        aVal = new Date(a.order_date || a.created_date);
        bVal = new Date(b.order_date || b.created_date);
      } else if (sortColumn === 'product') {
        aVal = a.product_name || '';
        bVal = b.product_name || '';
      } else if (sortColumn === 'vendor') {
        aVal = a.retailer || '';
        bVal = b.retailer || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedData = sortedData.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const handleSort = (columnId) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const toggleColumn = (colId) => {
    setVisibleColumns(prev =>
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  const showAllColumns = () => {
    setVisibleColumns(COLUMNS.map(c => c.id));
  };

  const displayColumns = COLUMNS.filter(c => visibleColumns.includes(c.id));

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(sortedData.map((_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return `$${Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'M/d/yyyy');
  };

  const truncateText = (text, length = 20) => {
    if (!text) return '—';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const getStatusStyles = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'purchased') return { bg: '#dbeafe', text: '#1d4ed8' };
    if (statusLower === 'shipped') return { bg: '#fef3c7', text: '#d97706' };
    if (statusLower === 'received') return { bg: '#dcfce7', text: '#16a34a' };
    if (statusLower === 'ordered') return { bg: '#e0e7ff', text: '#4338ca' };
    if (statusLower === 'cancelled') return { bg: '#fee2e2', text: '#dc2626' };
    return { bg: '#f3f4f6', text: '#374151' };
  };

  const downloadCSV = () => {
    const headers = displayColumns.map(c => c.label).join(',');
    const rows = sortedData.map(row => {
      return displayColumns.map(col => {
        let value = '';
        switch (col.id) {
          case 'date':
            value = formatDate(row.order_date || row.created_date);
            break;
          case 'product':
            value = row.product_name || row.items?.[0]?.product_name || '';
            break;
          case 'vendor':
            value = row.retailer || '';
            break;
          case 'platform':
            value = row.platform || '';
            break;
          case 'qty':
            value = row.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || '0';
            break;
          case 'cost':
            value = row.total_cost || row.original_price || '';
            break;
          case 'sale':
            value = row.final_cost || row.total_cost || '';
            break;
          case 'profit':
            value = (row.final_cost || row.total_cost || 0) - (row.total_cost || 0);
            break;
          case 'cashback':
            value = row.bonus_amount || '';
            break;
          case 'orderNum':
            value = row.order_number || '';
            break;
          case 'tracking':
            value = row.tracking_number || '';
            break;
          case 'payment':
            value = row.card_name || '';
            break;
          case 'status':
            value = row.status || '';
            break;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    const csv = [headers, rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.includes(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <button
              onClick={showAllColumns}
              className="w-full px-2 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Show All
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={showAllColumns}>
                ▦ PRO
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show all columns</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="outline" size="sm" onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                {displayColumns.map(col => (
                  <th
                    key={col.id}
                    onClick={() => col.sortable && handleSort(col.id)}
                    style={{ width: col.width }}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-700 ${
                      col.id === 'qty' ? 'text-center' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <span className="text-gray-400 text-xs">
                          {sortColumn === col.id && (sortDirection === 'asc' ? '↑' : '↓')}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ width: '80px' }} className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const globalIdx = startIdx + idx;
                const isSelected = selectedRows.has(globalIdx);
                return (
                  <tr
                    key={row.id || idx}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition group ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(globalIdx, e.target.checked)}
                        className="rounded"
                      />
                    </td>

                    {displayColumns.map(col => {
                      let content = '—';
                      let cellClass = 'px-4 py-3';

                      switch (col.id) {
                        case 'date':
                          content = formatDate(row.order_date || row.created_date);
                          cellClass += ' text-gray-600';
                          break;
                        case 'product':
                          content = row.product_name || row.items?.[0]?.product_name || '—';
                          cellClass += ' font-semibold text-gray-900';
                          break;
                        case 'vendor':
                          content = row.retailer || '—';
                          cellClass += ' text-gray-700';
                          break;
                        case 'platform':
                          content = row.platform || '—';
                          cellClass += ' text-gray-700 text-center';
                          break;
                        case 'qty':
                          content = row.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || '0';
                          cellClass += ' text-center text-gray-700';
                          break;
                        case 'cost':
                          content = formatCurrency(row.total_cost || row.original_price);
                          cellClass += ' text-purple-700 font-semibold';
                          break;
                        case 'sale':
                          content = formatCurrency(row.final_cost || row.total_cost);
                          cellClass += ' text-green-600 font-semibold';
                          break;
                        case 'profit':
                          {
                            const profit = (row.final_cost || row.total_cost || 0) - (row.total_cost || 0);
                            content = formatCurrency(profit);
                            cellClass += ' text-green-600 font-semibold';
                          }
                          break;
                        case 'cashback':
                          content = formatCurrency(row.bonus_amount);
                          cellClass += ' text-green-600 font-semibold';
                          break;
                        case 'orderNum':
                          {
                            const orderNum = row.order_number || '—';
                            const truncated = truncateText(orderNum, 10);
                            content = (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{truncated}</span>
                                  </TooltipTrigger>
                                  {orderNum !== '—' && <TooltipContent>{orderNum}</TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          break;
                        case 'tracking':
                          {
                            const tracking = row.tracking_number || '—';
                            const truncated = truncateText(tracking, 12);
                            content = (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{truncated}</span>
                                  </TooltipTrigger>
                                  {tracking !== '—' && <TooltipContent>{tracking}</TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          break;
                        case 'payment':
                          content = truncateText(row.card_name || '—', 24);
                          break;
                        case 'status':
                          {
                            const statusVal = row.status || 'unknown';
                            const styles = getStatusStyles(statusVal);
                            content = (
                              <span
                                className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                                style={{ backgroundColor: styles.bg, color: styles.text }}
                              >
                                {statusVal.toUpperCase()}
                              </span>
                            );
                          }
                          break;
                      }

                      return (
                        <td key={col.id} className={cellClass} style={{ width: col.width }}>
                          {content}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-right" style={{ width: '80px' }}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500"
                                onClick={() => onEdit?.(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500"
                                onClick={() => onExpand?.(row)}
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Expand</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => onDelete?.(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No transactions found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {sortedData.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, sortedData.length)} of {sortedData.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">
            Page {sortedData.length === 0 ? 0 : currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || sortedData.length === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}