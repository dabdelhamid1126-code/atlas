import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Pencil, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const ROWS_PER_PAGE = 10;

const COLUMN_WIDTHS = {
  checkbox: '40px',
  date: '90px',
  product: '150px',
  vendor: '100px',
  platform: '90px',
  qty: '50px',
  cost: '90px',
  sale: '90px',
  profit: '80px',
  cashback: '90px',
  orderNum: '110px',
  tracking: '110px',
  payment: '150px',
  status: '110px',
  actions: '80px',
};

export default function TransactionsTableMerged({
  data = [],
  visibleColumns = [],
  sortColumn = 'date',
  sortDirection = 'desc',
  onSort,
  onEdit,
  onView,
  onDelete,
  creditCards = [],
  isLoading = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ROWS_PER_PAGE);
  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

  const getStatusBadgeStyles = (status) => {
    const statusLower = status?.toLowerCase() || '';
    const styles = {
      'pending': { bg: '#dbeafe', text: '#1d4ed8' },
      'purchased': { bg: '#dbeafe', text: '#1d4ed8' },
      'ordered': { bg: '#e0e7ff', text: '#4338ca' },
      'shipped': { bg: '#fef3c7', text: '#d97706' },
      'delivered': { bg: '#f3e8ff', text: '#7c3aed' },
      'received': { bg: '#dcfce7', text: '#16a34a' },
      'cancelled': { bg: '#fee2e2', text: '#dc2626' },
    };
    return styles[statusLower] || { bg: '#f3f4f6', text: '#374151' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'M/d/yyyy');
  };

  const truncate = (text, len = 40) => {
    if (!text) return '—';
    return text.length > len ? text.substring(0, len) + '...' : text;
  };

  const formatPaymentMethod = (cardId) => {
    if (!cardId) return '—';
    const card = creditCards.find(c => c.id === cardId);
    if (card) {
      return `${card.card_name} (${cardId.slice(-4)})`;
    }
    return cardId;
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(data.map((_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (idx, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(idx);
    } else {
      newSelected.delete(idx);
    }
    setSelectedRows(newSelected);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-500">No transactions found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th style={{ width: COLUMN_WIDTHS.checkbox }} className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                {visibleColumns.includes('date') && (
                  <th
                    style={{ width: COLUMN_WIDTHS.date }}
                    onClick={() => onSort?.('date')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                  >
                    <div className="flex items-center gap-1">
                      Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('product') && (
                  <th style={{ width: COLUMN_WIDTHS.product }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                )}
                {visibleColumns.includes('vendor') && (
                  <th style={{ width: COLUMN_WIDTHS.vendor }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                )}
                {visibleColumns.includes('platform') && (
                  <th style={{ width: COLUMN_WIDTHS.platform }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Platform</th>
                )}
                {visibleColumns.includes('qty') && (
                  <th style={{ width: COLUMN_WIDTHS.qty }} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                )}
                {visibleColumns.includes('cost') && (
                  <th style={{ width: COLUMN_WIDTHS.cost }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost</th>
                )}
                {visibleColumns.includes('sale') && (
                  <th style={{ width: COLUMN_WIDTHS.sale }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sale</th>
                )}
                {visibleColumns.includes('profit') && (
                  <th style={{ width: COLUMN_WIDTHS.profit }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profit</th>
                )}
                {visibleColumns.includes('cashback') && (
                  <th style={{ width: COLUMN_WIDTHS.cashback }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cashback</th>
                )}
                {visibleColumns.includes('orderNum') && (
                  <th style={{ width: COLUMN_WIDTHS.orderNum }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order #</th>
                )}
                {visibleColumns.includes('tracking') && (
                  <th style={{ width: COLUMN_WIDTHS.tracking }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tracking #</th>
                )}
                {visibleColumns.includes('payment') && (
                  <th style={{ width: COLUMN_WIDTHS.payment }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                )}
                {visibleColumns.includes('status') && (
                  <th style={{ width: COLUMN_WIDTHS.status }} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                )}
                {visibleColumns.includes('actions') && (
                  <th style={{ width: COLUMN_WIDTHS.actions }} className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((order, idx) => {
                const globalIdx = startIdx + idx;
                const isSelected = selectedRows.has(globalIdx);
                const totalQty = order.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || 0;
                const profit = (order.final_cost || 0) - (order.total_cost || 0);

                return (
                  <tr
                    key={order.id || idx}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition group ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(globalIdx, e.target.checked)}
                        className="rounded"
                      />
                    </td>

                    {visibleColumns.includes('date') && (
                      <td style={{ width: COLUMN_WIDTHS.date }} className="px-3 py-3 text-gray-600">
                        {formatDate(order.order_date || order.created_date)}
                      </td>
                    )}

                    {visibleColumns.includes('product') && (
                      <td style={{ width: COLUMN_WIDTHS.product }} className="px-3 py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-bold text-gray-900 cursor-help">
                                {truncate(order.product_name || order.items?.[0]?.product_name, 40)}
                              </span>
                            </TooltipTrigger>
                            {(order.product_name || order.items?.[0]?.product_name) && (
                              <TooltipContent>{order.product_name || order.items?.[0]?.product_name}</TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    )}

                    {visibleColumns.includes('vendor') && (
                      <td style={{ width: COLUMN_WIDTHS.vendor }} className="px-3 py-3 text-gray-700">
                        {order.retailer || '—'}
                      </td>
                    )}

                    {visibleColumns.includes('platform') && (
                      <td style={{ width: COLUMN_WIDTHS.platform }} className="px-3 py-3 text-gray-700">
                        {order.platform || '—'}
                      </td>
                    )}

                    {visibleColumns.includes('qty') && (
                      <td style={{ width: COLUMN_WIDTHS.qty }} className="px-3 py-3 text-center text-gray-700">
                        {totalQty}
                      </td>
                    )}

                    {visibleColumns.includes('cost') && (
                      <td style={{ width: COLUMN_WIDTHS.cost }} className="px-3 py-3 text-purple-700 font-semibold">
                        ${(order.total_cost || 0).toFixed(2)}
                      </td>
                    )}

                    {visibleColumns.includes('sale') && (
                      <td style={{ width: COLUMN_WIDTHS.sale }} className="px-3 py-3 text-green-600 font-semibold">
                        ${(order.final_cost || order.total_cost || 0).toFixed(2)}
                      </td>
                    )}

                    {visibleColumns.includes('profit') && (
                      <td style={{ width: COLUMN_WIDTHS.profit }} className={`px-3 py-3 font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${profit.toFixed(2)}
                      </td>
                    )}

                    {visibleColumns.includes('cashback') && (
                      <td style={{ width: COLUMN_WIDTHS.cashback }} className="px-3 py-3 text-green-600 font-semibold">
                        ${(order.bonus_amount || 0).toFixed(2)}
                      </td>
                    )}

                    {visibleColumns.includes('orderNum') && (
                      <td style={{ width: COLUMN_WIDTHS.orderNum }} className="px-3 py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{truncate(order.order_number, 20)}</span>
                            </TooltipTrigger>
                            <TooltipContent>{order.order_number}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    )}

                    {visibleColumns.includes('tracking') && (
                      <td style={{ width: COLUMN_WIDTHS.tracking }} className="px-3 py-3">
                        {order.tracking_number ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{truncate(order.tracking_number, 20)}</span>
                              </TooltipTrigger>
                              <TooltipContent>{order.tracking_number}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('payment') && (
                      <td style={{ width: COLUMN_WIDTHS.payment }} className="px-3 py-3">
                        {truncate(formatPaymentMethod(order.credit_card_id), 40)}
                      </td>
                    )}

                    {visibleColumns.includes('status') && (
                      <td style={{ width: COLUMN_WIDTHS.status }} className="px-3 py-3">
                        {order.status && (
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: getStatusBadgeStyles(order.status).bg,
                              color: getStatusBadgeStyles(order.status).text,
                            }}
                          >
                            {order.status.toUpperCase()}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('actions') && (
                      <td style={{ width: COLUMN_WIDTHS.actions }} className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-600"
                                  onClick={() => onEdit?.(order)}
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
                                  className="h-8 w-8 text-gray-600"
                                  onClick={() => onView?.(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => onDelete?.(order)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing {data.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, data.length)} of {data.length}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">Page {data.length === 0 ? 0 : currentPage} of {totalPages || 1}</span>
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