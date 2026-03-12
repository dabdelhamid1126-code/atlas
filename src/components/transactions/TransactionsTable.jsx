import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, Eye, EyeOff, Download, Pencil, ArrowUpRight, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_COLUMNS = [
  { id: 'date', label: 'DATE', visible: true },
  { id: 'product', label: 'PRODUCT', visible: true },
  { id: 'vendor', label: 'VENDOR', visible: true },
  { id: 'platform', label: 'PLATFORM', visible: true },
  { id: 'qty', label: 'QTY', visible: true },
  { id: 'cost', label: 'COST', visible: true },
  { id: 'sale', label: 'SALE', visible: true },
  { id: 'profit', label: 'PROFIT', visible: true },
  { id: 'cashback', label: 'CASHBACK', visible: true },
  { id: 'orderNum', label: 'ORDER #', visible: true },
  { id: 'tracking', label: 'TRACKING #', visible: true },
  { id: 'payment', label: 'PAYMENT', visible: true },
  { id: 'status', label: 'STATUS', visible: true },
];

const ROWS_PER_PAGE = 10;

export default function TransactionsTable({ data = [], onEdit, onDelete, onExpand }) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  const toggleColumn = useCallback((columnId) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const showAllColumns = useCallback(() => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  }, []);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(data.map((_, i) => i)));
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

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'MM/dd/yyyy');
  };

  const truncateText = (text, maxLength = 15) => {
    if (!text) return '—';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'purchased' || statusLower === 'ordered') return 'bg-blue-100 text-blue-700';
    if (statusLower === 'shipped') return 'bg-purple-100 text-purple-700';
    if (statusLower === 'received') return 'bg-green-100 text-green-700';
    if (statusLower === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const downloadCSV = () => {
    const headers = visibleColumns.map(col => col.label).join(',');
    const rows = data.map(row => {
      return visibleColumns.map(col => {
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
            value = row.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || '';
            break;
          case 'cost':
            value = row.total_cost || row.original_price || '';
            break;
          case 'sale':
            value = row.final_cost || row.total_cost || '';
            break;
          case 'profit':
            value = (row.final_cost || row.total_cost) - (row.total_cost || 0) || '';
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
          default:
            value = '';
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
            {columns.map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.visible}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={showAllColumns}>
              <Eye className="h-4 w-4 mr-2" />
              Show All
            </DropdownMenuItem>
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
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                {visibleColumns.map(col => (
                  <th
                    key={col.id}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 whitespace-nowrap ${
                      ['qty', 'cost', 'sale', 'profit', 'cashback'].includes(col.id) ? 'text-right' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const globalIdx = startIdx + idx;
                const isSelected = selectedRows.has(globalIdx);
                return (
                  <tr
                    key={row.id || idx}
                    className={`border-b hover:bg-slate-50 transition ${
                      isSelected ? 'bg-blue-50' : ''
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

                    {visibleColumns.map(col => {
                      let cellContent = '—';
                      let cellClass = 'px-4 py-3 text-slate-900';

                      switch (col.id) {
                        case 'date':
                          cellContent = formatDate(row.order_date || row.created_date);
                          cellClass += ' text-slate-500';
                          break;
                        case 'product':
                          cellContent = row.product_name || row.items?.[0]?.product_name || '';
                          cellClass += ' font-semibold';
                          break;
                        case 'vendor':
                          cellContent = row.retailer || '—';
                          break;
                        case 'platform':
                          cellContent = row.platform || '—';
                          break;
                        case 'qty':
                          cellContent = row.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || '0';
                          cellClass += ' text-right';
                          break;
                        case 'cost':
                          cellContent = formatCurrency(row.total_cost || row.original_price);
                          cellClass += ' text-right text-purple-600 font-semibold';
                          break;
                        case 'sale':
                          cellContent = formatCurrency(row.final_cost || row.total_cost);
                          cellClass += ' text-right text-green-600 font-semibold';
                          break;
                        case 'profit':
                          {
                            const profit = (row.final_cost || row.total_cost) - (row.total_cost || 0);
                            cellContent = formatCurrency(profit);
                            cellClass += ' text-right text-green-600 font-semibold';
                          }
                          break;
                        case 'cashback':
                          cellContent = formatCurrency(row.bonus_amount);
                          cellClass += ' text-right text-blue-600 font-semibold';
                          break;
                        case 'orderNum':
                          {
                            const orderNum = row.order_number || '—';
                            const truncated = truncateText(orderNum, 12);
                            cellContent = (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{truncated}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{orderNum}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          break;
                        case 'tracking':
                          {
                            const tracking = row.tracking_number || '—';
                            const truncated = truncateText(tracking, 15);
                            cellContent = (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{truncated}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{tracking}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          break;
                        case 'payment':
                          cellContent = truncateText(row.card_name || '—', 20);
                          break;
                        case 'status':
                          cellContent = (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
                              {(row.status || 'UNKNOWN').toUpperCase()}
                            </span>
                          );
                          break;
                        default:
                          break;
                      }

                      return (
                        <td key={col.id} className={cellClass}>
                          {cellContent}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-700"
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
                                className="h-8 w-8 text-slate-500 hover:text-slate-700"
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
                                className="h-8 w-8 text-red-500 hover:text-red-700"
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

        {data.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No transactions found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Showing {data.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, data.length)} of {data.length}
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
          <span className="px-3">
            Page {data.length === 0 ? 0 : currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || data.length === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}