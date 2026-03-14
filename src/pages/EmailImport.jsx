import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Upload, CheckCircle, XCircle, Loader2, FileText, Inbox,
  RefreshCw, ChevronDown, ChevronUp, ShoppingCart, AlertCircle,
  X, Package, Link, ExternalLink, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── Product matching helper ──────────────────────────────────────────────────
const matchProducts = (items, allProducts) =>
  items.map(item => {
    const suggestions = allProducts
      .map(p => {
        let score = 0;
        const iName = item.product_name?.toLowerCase() || '';
        const pName = p.name?.toLowerCase() || '';
        if (item.sku && p.upc === item.sku) score = 100;
        else if (pName === iName) score = 95;
        else if (pName.includes(iName) || iName.includes(pName)) score = 80;
        else {
          const iWords = iName.split(/\s+/).filter(w => w.length > 2);
          const pWords = pName.split(/\s+/).filter(w => w.length > 2);
          const matching = iWords.filter(iw => pWords.some(pw =>
            pw.includes(iw) || iw.includes(pw) ||
            (Math.abs(pw.length - iw.length) <= 2 && (pw.startsWith(iw.slice(0, 3)) || iw.startsWith(pw.slice(0, 3))))
          )).length;
          if (matching > 0) score = (matching / Math.max(iWords.length, pWords.length)) * 75;
          if (Math.abs(iName.length - pName.length) < 5) score += 5;
          const iNums = iName.match(/\d+/g) || [];
          const pNums = pName.match(/\d+/g) || [];
          score += iNums.filter(n => pNums.includes(n)).length * 10;
        }
        return { product: p, score };
      })
      .filter(m => m.score > 20)
      .sort((a, b) => b.score !== a.score ? b.score - a.score : a.product.name.localeCompare(b.product.name))
      .slice(0, 8);
    return {
      invoiceName: item.product_name,
      sku: item.sku,
      quantity: item.quantity || 1,
      unit_cost: item.unit_cost || 0,
      suggestions,
      selectedProduct: suggestions[0]?.product || null,
    };
  });

const RETAILER_LOGOS = {
  amazon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png',
  bestbuy: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Best_Buy_Logo.svg/200px-Best_Buy_Logo.svg.png',
  walmart: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Walmart_Spark.svg/200px-Walmart_Spark.svg.png',
  target: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Target_Corporation_logo_%28vector%29.svg/200px-Target_Corporation_logo_%28vector%29.svg.png',
};
const getRetailerLogo = (name) => {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  return Object.entries(RETAILER_LOGOS).find(([k]) => key.includes(k))?.[1] || null;
};

// ─── Inbox Email Row ──────────────────────────────────────────────────────────
function EmailRow({ group, onImport, onReject, processing, isImported, isRejected }) {
  const [expanded, setExpanded] = useState(true);
  const logo = getRetailerLogo(group.retailer);
  const dateStr = group.date ? new Date(group.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className={`rounded-xl border transition-all ${isImported ? 'border-green-200 bg-green-50' : isRejected ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <AlertCircle className={`h-4 w-4 flex-shrink-0 ${isImported ? 'text-green-500' : isRejected ? 'text-red-500' : 'text-amber-400'}`} />
        <span className={`flex-1 text-sm font-semibold truncate ${isImported ? 'text-slate-400 line-through' : isRejected ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {group.subject}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500">
          <span>{group.emailCount > 1 ? `${group.emailCount} events` : '1 event'}</span>
          {dateStr && <span>{dateStr}</span>}
          {isImported && <span className="text-green-400 font-semibold text-[11px]">IMPORTED</span>}
          {isRejected && <span className="text-red-400 font-semibold text-[11px]">REJECTED</span>}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expanded detail row */}
      {expanded && !isImported && !isRejected && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 flex items-center gap-4">
          {/* Checkbox */}
          <input type="checkbox" className="rounded border-slate-300 h-4 w-4 accent-violet-600 flex-shrink-0" />

          {/* "Order Placed" label */}
          <span className="text-xs font-bold text-violet-600 uppercase tracking-wider whitespace-nowrap">Order Placed</span>

          {/* Retailer logo/icon + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {logo ? (
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 flex-shrink-0">
                <img src={logo} alt={group.retailer} className="h-7 w-7 object-contain" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Package className="h-4 w-4 text-slate-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{group.retailer || 'Unknown'}</p>
              {group.orderNumber && <p className="text-[11px] text-slate-500">Order: {group.orderNumber}</p>}
              {group.totalCost != null && <p className="text-[11px] text-slate-600">$ {group.totalCost.toFixed(2)}</p>}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-amber-600 font-semibold">Confidence: {group.confidence || 95}%</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">PENDING</span>
              </div>
              {group.productName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Link className="h-3 w-3 text-violet-500" />
                  <span className="text-[11px] text-violet-600">Linked: {group.productName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onImport(group)}
              disabled={processing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-violet-300 bg-white text-violet-700 text-xs font-semibold hover:bg-violet-50 transition disabled:opacity-50"
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
              Import
            </button>
            <button
              onClick={() => onReject(group.id)}
              disabled={processing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-500 text-xs font-semibold hover:bg-red-50 transition disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmailImport() {
  const [pdfFile, setPdfFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [productMatches, setProductMatches] = useState([]);
  const [gmailEmails, setGmailEmails] = useState([]);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [gmailAfterDate, setGmailAfterDate] = useState('');
  const [gmailBeforeDate, setGmailBeforeDate] = useState('');
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [importedIds, setImportedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  const fetchGmailEmails = async () => {
    setLoadingGmail(true);
    try {
      const params = {};
      if (gmailAfterDate) params.afterDate = gmailAfterDate;
      if (gmailBeforeDate) params.beforeDate = gmailBeforeDate;
      const res = await base44.functions.invoke('fetchGmailEmails', params);
      setGmailEmails(res.data?.emails || []);
    } catch (e) {
      toast.error('Failed to fetch Gmail: ' + e.message);
    } finally {
      setLoadingGmail(false);
    }
  };

  const handleReject = (id) => {
    setRejectedIds(prev => new Set([...prev, id]));
  };

  const handleImportGroup = async (group) => {
    setProcessingId(group.id);
    setProcessing(true);
    try {
      const idsToFetch = group?.ids || [group.id];
      const res = idsToFetch.length > 1
        ? await base44.functions.invoke('fetchGmailEmails', { messageIds: idsToFetch })
        : await base44.functions.invoke('fetchGmailEmails', { messageId: group.id });
      const { subject, body } = res.data || {};
      const content = `Subject: ${subject}\n\n${body}`;

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract order information from this email content from one of these retailers: Amazon, Best Buy, Woot, Walmart, or Target.
The content may contain both an order confirmation email AND a shipping/tracking email for the same order combined together.
Extract: order number, retailer name, total cost, order date (YYYY-MM-DD format), tracking number (look in both emails), last 4 digits of credit card used, gift card codes/numbers used (if any), and list of items with product names, SKU/UPC codes, prices, and quantities.
If there are two emails for the same order, merge the data.\n\n${content}`,
        response_json_schema: {
          type: "object",
          properties: {
            retailer: { type: "string" },
            order_number: { type: "string" },
            total_cost: { type: "number" },
            order_date: { type: "string" },
            tracking_number: { type: "string" },
            card_last_4: { type: "string" },
            gift_card_codes: { type: "array", items: { type: "string" } },
            items: { type: "array", items: { type: "object", properties: { product_name: { type: "string" }, sku: { type: "string" }, unit_cost: { type: "number" }, quantity: { type: "number" } } } }
          }
        }
      });

      const existing = await base44.entities.PurchaseOrder.filter({ order_number: extracted.order_number });
      if (existing.length > 0) {
        const existingOrder = existing[0];
        if (extracted.tracking_number && !existingOrder.tracking_number) {
          await base44.entities.PurchaseOrder.update(existingOrder.id, { tracking_number: extracted.tracking_number, status: 'shipped' });
          toast.success(`Tracking updated for order ${extracted.order_number}`);
          setImportedIds(prev => new Set([...prev, group.id]));
        } else {
          toast.error(`Order ${extracted.order_number} already exists`);
        }
        return;
      }

      const [allProducts, allCards, allGiftCards] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.CreditCard.list(),
        base44.entities.GiftCard.list()
      ]);

      let matchedCard = null;
      if (extracted.card_last_4) matchedCard = allCards.find(c => c.card_name?.includes(extracted.card_last_4));
      const matchedGiftCards = [];
      for (const code of extracted.gift_card_codes || []) {
        const gc = allGiftCards.find(g => g.code && g.code.includes(code.replace(/\s+/g, '')));
        if (gc) matchedGiftCards.push(gc);
      }

      setExtractedData({ ...extracted, matchedCard, matchedGiftCards, importSource: 'Gmail', _groupId: group.id });
      setProductMatches(matchProducts(extracted.items || [], allProducts));
      setConfirmDialogOpen(true);
    } catch (err) {
      toast.error('Failed to process email: ' + err.message);
    } finally {
      setProcessing(false);
      setProcessingId(null);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) { toast.error('Please select a PDF file'); return; }
    setProcessing(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract order information from this order confirmation (any retailer). Extract: order number, retailer name, total cost, order date (YYYY-MM-DD format), tracking number if available, last 4 digits of credit card used, gift card codes/numbers used (if any), and list of items with product names, SKU/UPC codes, prices, and quantities.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            retailer: { type: "string" },
            order_number: { type: "string" },
            total_cost: { type: "number" },
            order_date: { type: "string" },
            tracking_number: { type: "string" },
            card_last_4: { type: "string" },
            gift_card_codes: { type: "array", items: { type: "string" } },
            items: { type: "array", items: { type: "object", properties: { product_name: { type: "string" }, sku: { type: "string" }, unit_cost: { type: "number" }, quantity: { type: "number" } } } }
          }
        }
      });

      const existing = await base44.entities.PurchaseOrder.filter({ order_number: extracted.order_number });
      if (existing.length > 0) { setResult({ success: false, message: 'Order already exists' }); toast.error('Order already exists'); return; }

      const [allProducts, allCards, allGiftCards] = await Promise.all([
        base44.entities.Product.list(), base44.entities.CreditCard.list(), base44.entities.GiftCard.list()
      ]);

      let matchedCard = null;
      if (extracted.card_last_4) matchedCard = allCards.find(c => c.card_name?.includes(extracted.card_last_4));
      const matchedGiftCards = [];
      for (const code of extracted.gift_card_codes || []) {
        const gc = allGiftCards.find(g => g.code && g.code.includes(code.replace(/\s+/g, '')));
        if (gc) matchedGiftCards.push(gc);
      }

      setExtractedData({ ...extracted, matchedCard, matchedGiftCards, importSource: 'PDF' });
      setProductMatches(matchProducts(extracted.items || [], allProducts));
      setConfirmDialogOpen(true);
      setPdfFile(null);
    } catch (error) {
      toast.error('Error processing PDF: ' + error.message);
      setResult({ success: false, message: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    setProcessing(true);
    try {
      const orderItems = productMatches.map(match => ({
        product_id: match.selectedProduct?.id || '',
        product_name: match.selectedProduct?.name || '',
        upc: match.selectedProduct?.upc || match.sku || '',
        quantity_ordered: match.quantity,
        quantity_received: 0,
        unit_cost: match.unit_cost
      }));

      const giftCardIds = extractedData.matchedGiftCards?.map(gc => gc.id) || [];
      const giftCardValue = extractedData.matchedGiftCards?.reduce((sum, gc) => sum + (gc.value || 0), 0) || 0;

      const orderData = {
        order_number: extractedData.order_number,
        retailer: extractedData.retailer || 'Unknown',
        tracking_number: extractedData.tracking_number || '',
        credit_card_id: extractedData.matchedCard?.id || null,
        card_name: extractedData.matchedCard?.card_name || null,
        gift_card_ids: giftCardIds,
        gift_card_value: giftCardValue,
        status: extractedData.tracking_number ? 'shipped' : 'ordered',
        order_date: extractedData.order_date || format(new Date(), 'yyyy-MM-dd'),
        items: orderItems,
        total_cost: extractedData.total_cost || 0,
        final_cost: (extractedData.total_cost || 0) - giftCardValue,
        category: 'other',
        notes: `Imported from ${extractedData.importSource || 'PDF'}`
      };

      const created = await base44.entities.PurchaseOrder.create(orderData);

      for (const cardId of giftCardIds) {
        await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: extractedData.order_number });
      }

      if (extractedData.matchedCard?.id && orderData.total_cost) {
        const card = extractedData.matchedCard;
        const amount = orderData.final_cost;
        let rewardAmount = 0, rewardType = 'cashback', currency = 'USD';
        if (card.reward_type === 'cashback' && card.cashback_rate > 0) {
          rewardAmount = parseFloat((amount * card.cashback_rate / 100).toFixed(2));
        } else if (card.reward_type === 'points' && card.points_rate > 0) {
          rewardAmount = Math.round(amount * card.points_rate);
          rewardType = 'points'; currency = 'points';
        } else if (card.reward_type === 'both') {
          if (card.cashback_rate > 0) rewardAmount = parseFloat((amount * card.cashback_rate / 100).toFixed(2));
          else if (card.points_rate > 0) { rewardAmount = Math.round(amount * card.points_rate); rewardType = 'points'; currency = 'points'; }
        }
        if (rewardAmount > 0) {
          await base44.entities.Reward.create({
            credit_card_id: card.id, card_name: card.card_name, source: card.card_name,
            type: rewardType, purchase_amount: amount, amount: rewardAmount, currency,
            purchase_order_id: created.id, order_number: extractedData.order_number,
            date_earned: orderData.order_date, status: 'pending',
            notes: `Auto-generated from imported order ${extractedData.order_number}`
          });
        }
      }

      if (extractedData._groupId) setImportedIds(prev => new Set([...prev, extractedData._groupId]));
      setResult({ success: true, message: 'Order imported successfully', order: created });
      toast.success('Order imported with rewards calculated!');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setConfirmDialogOpen(false);
      setExtractedData(null);
      setProductMatches([]);
    } catch (error) {
      setResult({ success: false, message: error.message || 'Failed to import order' });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = gmailEmails.filter(g => !rejectedIds.has(g.id) && !importedIds.has(g.id)).length;
  const visibleEmails = gmailEmails.filter(g => {
    if (activeTab === 'needs_review') return !rejectedIds.has(g.id) && !importedIds.has(g.id);
    if (activeTab === 'processed') return importedIds.has(g.id);
    if (activeTab === 'failed') return rejectedIds.has(g.id);
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                {pendingCount} needs review
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Forwarded order emails — review and import as transactions.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Left: Inbox ── */}
        <div className="flex-1 min-w-0">
          {/* Select All + date filters row */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-600 h-4 w-4 accent-violet-500"
                onChange={(e) => {/* select all logic could go here */}} />
              <span className="text-sm text-muted-foreground">Select All Pending</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="date" value={gmailAfterDate} onChange={e => setGmailAfterDate(e.target.value)}
                className="h-7 px-2 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
              <span className="text-muted-foreground text-xs">→</span>
              <input type="date" value={gmailBeforeDate} onChange={e => setGmailBeforeDate(e.target.value)}
                className="h-7 px-2 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
              <button onClick={fetchGmailEmails} disabled={loadingGmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition disabled:opacity-60">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingGmail ? 'animate-spin' : ''}`} />
                {loadingGmail ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border mb-4">
            {[
              { id: 'all', label: 'All', count: gmailEmails.length },
              { id: 'needs_review', label: 'Needs Review', count: pendingCount },
              { id: 'processed', label: 'Processed', count: importedIds.size },
              { id: 'failed', label: 'Failed', count: rejectedIds.size },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                  activeTab === tab.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-violet-500/20 text-violet-400' : 'bg-muted text-muted-foreground'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Email list */}
          {loadingGmail ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Fetching emails from Gmail…</p>
            </div>
          ) : gmailEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Inbox className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No order emails yet</p>
              <p className="text-xs mt-1 opacity-60">Click "Fetch" to load from Gmail</p>
            </div>
          ) : visibleEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-sm">Nothing in this tab</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleEmails.map(group => (
                <EmailRow
                  key={group.id}
                  group={group}
                  onImport={handleImportGroup}
                  onReject={handleReject}
                  processing={processingId === group.id}
                  isImported={importedIds.has(group.id)}
                  isRejected={rejectedIds.has(group.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: PDF Upload ── */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-violet-400" />
              <p className="text-sm font-bold text-foreground">Upload PDF</p>
            </div>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${pdfFile ? 'border-violet-500/60 bg-violet-500/5' : 'border-border hover:border-violet-500/40'}`}>
              <FileText className={`h-7 w-7 mb-2 ${pdfFile ? 'text-violet-400' : 'text-muted-foreground'}`} />
              <p className="text-xs text-center text-muted-foreground">
                {pdfFile ? <span className="font-semibold text-violet-400">{pdfFile.name}</span> : 'Click to select PDF'}
              </p>
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </label>
            {pdfFile && (
              <button onClick={handlePdfUpload} disabled={processing}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {processing ? 'Processing…' : 'Import PDF'}
              </button>
            )}
            {result && (
              <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${result.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {result.success ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How it works</p>
            {[
              { n: '1', t: 'Fetch Gmail', d: 'Auto-loads order emails from inbox' },
              { n: '2', t: 'Review', d: 'Confirm order details and products' },
              { n: '3', t: 'Import', d: 'Creates transaction + rewards' },
            ].map(s => (
              <div key={s.n} className="flex gap-3 mb-3 last:mb-0">
                <div className="h-5 w-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.t}</p>
                  <p className="text-[11px] text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Product Matches</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Review before importing order <span className="font-semibold text-violet-400">#{extractedData?.order_number}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Order summary */}
            <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-xl p-4">
              {[
                { label: 'Retailer', value: extractedData?.retailer },
                { label: 'Total', value: extractedData?.total_cost != null ? `$${extractedData.total_cost.toFixed(2)}` : '—' },
                { label: 'Order Date', value: extractedData?.order_date || '—' },
                { label: 'Credit Card', value: extractedData?.matchedCard?.card_name || 'None matched' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{f.value}</p>
                </div>
              ))}
              {extractedData?.matchedGiftCards?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gift Cards</p>
                  {extractedData.matchedGiftCards.map((gc, i) => (
                    <p key={i} className="text-sm font-semibold text-green-400">{gc.brand} — ${gc.value} (…{gc.code?.slice(-4)})</p>
                  ))}
                </div>
              )}
            </div>

            {/* Products */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Products ({productMatches.length})</p>
              <div className="space-y-3">
                {productMatches.map((match, index) => (
                  <div key={index} className="border border-border rounded-xl p-4 relative bg-card">
                    <button onClick={() => setProductMatches(productMatches.filter((_, i) => i !== index))}
                      className="absolute top-3 right-3 text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                    <div className="flex justify-between items-start pr-20 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{match.invoiceName}</p>
                        {match.sku && (
                          <a href={`https://www.google.com/search?q=${encodeURIComponent(match.sku)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-violet-400 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> UPC: {match.sku}
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Qty: {match.quantity}</p>
                        <p className="text-sm font-bold text-foreground">${match.unit_cost?.toFixed(2)}</p>
                      </div>
                    </div>
                    <Select
                      value={match.selectedProduct?.name || ''}
                      onValueChange={(value) => {
                        const newMatches = [...productMatches];
                        newMatches[index].selectedProduct = match.suggestions.map(s => s.product).find(p => p.name === value) || null;
                        setProductMatches(newMatches);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select a product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {match.suggestions.sort((a, b) => a.product.name.localeCompare(b.product.name)).map(s => (
                          <SelectItem key={s.product.id} value={s.product.name}>
                            {s.product.name}{s.score > 90 ? ' ✓' : ''}{s.product.upc ? ` (${s.product.upc})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {match.suggestions.length === 0 && <p className="text-[11px] text-amber-400 mt-1">⚠️ No matching products found</p>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setProductMatches([...productMatches, { invoiceName: 'New Item', sku: '', quantity: 1, unit_cost: 0, suggestions: [], selectedProduct: null }])}
                className="mt-3 text-sm text-violet-400 hover:text-violet-300 font-medium">
                + Add Item
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
            <button onClick={() => { setConfirmDialogOpen(false); setExtractedData(null); setProductMatches([]); }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition">
              Cancel
            </button>
            <button onClick={handleConfirmImport}
              disabled={processing || productMatches.some(m => !m.selectedProduct)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {processing ? 'Importing…' : 'Confirm & Import'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}