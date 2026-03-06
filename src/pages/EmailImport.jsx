import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Inner tabs for import methods still used below
import { Mail, Upload, CheckCircle, XCircle, Loader2, FileText, Inbox, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function EmailImport() {
  const [emailContent, setEmailContent] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [productMatches, setProductMatches] = useState([]);
  const [gmailEmails, setGmailEmails] = useState([]);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [selectedGmailIds, setSelectedGmailIds] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [gmailAfterDate, setGmailAfterDate] = useState('');
  const [gmailBeforeDate, setGmailBeforeDate] = useState('');
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

  const toggleGmailSelection = (id) => {
    setSelectedGmailIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleParse = async () => {
    if (!emailContent.trim()) {
      toast.error('Please paste email content');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      // Use the same LLM extraction flow as PDF/Gmail
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract order information from this email content from one of these retailers: Amazon, Best Buy, Woot, Walmart, or Target.
The content may contain both an order confirmation and a shipping/tracking email for the same order combined together.
Extract: order number, retailer name, total cost, order date (YYYY-MM-DD format), tracking number (look in both emails if present), last 4 digits of credit card used, gift card codes/numbers used (if any), and list of items with product names, SKU/UPC codes, prices, and quantities.
If there are two emails for the same order, merge the data.\n\n${emailContent}`,
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

      if (!extracted.order_number) {
        toast.error('Could not extract order number from email');
        setResult({ success: false, message: 'Could not extract order information' });
        return;
      }

      const existing = await base44.entities.PurchaseOrder.filter({ order_number: extracted.order_number });
      if (existing.length > 0) {
        const existingOrder = existing[0];
        if (extracted.tracking_number && !existingOrder.tracking_number) {
          await base44.entities.PurchaseOrder.update(existingOrder.id, {
            tracking_number: extracted.tracking_number,
            status: 'shipped'
          });
          toast.success(`Tracking updated for order ${extracted.order_number}`);
          setEmailContent('');
          setResult({ success: true, message: `Tracking updated for existing order ${extracted.order_number}` });
        } else {
          toast.error(`Order ${extracted.order_number} already exists`);
          setResult({ success: false, message: `Order ${extracted.order_number} already exists` });
        }
        return;
      }

      const [allProducts, allCards, allGiftCards] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.CreditCard.list(),
        base44.entities.GiftCard.list()
      ]);

      let matchedCard = null;
      if (extracted.card_last_4) {
        matchedCard = allCards.find(c => c.card_name?.includes(extracted.card_last_4));
      }
      const matchedGiftCards = [];
      for (const code of extracted.gift_card_codes || []) {
        const gc = allGiftCards.find(g => g.code && g.code.includes(code.replace(/\s+/g, '')));
        if (gc) matchedGiftCards.push(gc);
      }

      const matches = [];
      for (const item of extracted.items || []) {
        const suggestions = allProducts
          .map(p => {
            let score = 0;
            const itemName = item.product_name?.toLowerCase() || '';
            const prodName = p.name?.toLowerCase() || '';
            if (item.sku && p.upc === item.sku) score = 100;
            else if (prodName === itemName) score = 95;
            else if (prodName.includes(itemName) || itemName.includes(prodName)) score = 80;
            else {
              const itemWords = itemName.split(/\s+/).filter(w => w.length > 2);
              const prodWords = prodName.split(/\s+/).filter(w => w.length > 2);
              const matchingWords = itemWords.filter(iw => prodWords.some(pw => pw.includes(iw) || iw.includes(pw) || (Math.abs(pw.length - iw.length) <= 2 && (pw.startsWith(iw.slice(0, 3)) || iw.startsWith(pw.slice(0, 3)))))).length;
              if (matchingWords > 0) score = (matchingWords / Math.max(itemWords.length, prodWords.length)) * 75;
              if (Math.abs(itemName.length - prodName.length) < 5) score += 5;
              const itemNumbers = itemName.match(/\d+/g) || [];
              const prodNumbers = prodName.match(/\d+/g) || [];
              score += itemNumbers.filter(num => prodNumbers.includes(num)).length * 10;
            }
            return { product: p, score };
          })
          .filter(m => m.score > 20)
          .sort((a, b) => b.score !== a.score ? b.score - a.score : a.product.name.localeCompare(b.product.name))
          .slice(0, 8);

        matches.push({
          invoiceName: item.product_name,
          sku: item.sku,
          quantity: item.quantity || 1,
          unit_cost: item.unit_cost || 0,
          suggestions,
          selectedProduct: suggestions[0]?.product || null
        });
      }

      setExtractedData({ ...extracted, matchedCard, matchedGiftCards, importSource: 'Email' });
      setProductMatches(matches);
      setConfirmDialogOpen(true);
      setEmailContent('');
    } catch (error) {
      toast.error('Error parsing email: ' + error.message);
      setResult({ success: false, message: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      // Upload the PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // Extract order data from PDF using LLM
      const extractedData = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract order information from this order confirmation (any retailer). Extract: order number, retailer name, total cost, order date (YYYY-MM-DD format), tracking number if available, last 4 digits of credit card used, gift card codes/numbers used (if any), and list of items with product names, SKU/UPC codes, prices, and quantities. Return the exact order number as shown in the document.`,
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
            gift_card_codes: { 
              type: "array",
              items: { type: "string" }
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  sku: { type: "string" },
                  unit_cost: { type: "number" },
                  quantity: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Check if order already exists
      const existing = await base44.entities.PurchaseOrder.filter({ 
        order_number: extractedData.order_number 
      });
      
      if (existing.length > 0) {
        setResult({ success: false, message: 'Order already exists', order_number: extractedData.order_number });
        toast.error('Order already exists');
        return;
      }

      // Get all products, credit cards, and gift cards to match
      const allProducts = await base44.entities.Product.list();
      const allCards = await base44.entities.CreditCard.list();
      const allGiftCards = await base44.entities.GiftCard.list();

      // Match credit card by last 4 digits
      let matchedCard = null;
      if (extractedData.card_last_4) {
        matchedCard = allCards.find(card => 
          card.card_name?.includes(extractedData.card_last_4)
        );
      }

      // Match gift cards by code
      const matchedGiftCards = [];
      if (extractedData.gift_card_codes && extractedData.gift_card_codes.length > 0) {
        for (const giftCardCode of extractedData.gift_card_codes) {
          const matched = allGiftCards.find(gc => 
            gc.code && gc.code.includes(giftCardCode.replace(/\s+/g, ''))
          );
          if (matched) {
            matchedGiftCards.push(matched);
          }
        }
      }

      // Find product matches and suggestions
      const matches = [];
      
      for (const item of extractedData.items || []) {
        // Find top 8 suggestions for each item with better fuzzy matching
        const suggestions = allProducts
          .map(p => {
            let score = 0;
            const itemName = item.product_name?.toLowerCase() || '';
            const prodName = p.name?.toLowerCase() || '';
            
            // SKU/UPC exact match gets highest priority
            if (item.sku && p.upc === item.sku) score = 100;
            // Exact name match
            else if (prodName === itemName) score = 95;
            // Contains match
            else if (prodName.includes(itemName) || itemName.includes(prodName)) score = 80;
            // Partial word matching and fuzzy logic
            else {
              const itemWords = itemName.split(/\s+/).filter(w => w.length > 2);
              const prodWords = prodName.split(/\s+/).filter(w => w.length > 2);
              
              // Count matching words
              const matchingWords = itemWords.filter(iw => 
                prodWords.some(pw => 
                  pw.includes(iw) || iw.includes(pw) || 
                  // Levenshtein-like: check if words are similar
                  Math.abs(pw.length - iw.length) <= 2 && (pw.startsWith(iw.slice(0, 3)) || iw.startsWith(pw.slice(0, 3)))
                )
              ).length;
              
              // Score based on matching words ratio
              if (matchingWords > 0) {
                score = (matchingWords / Math.max(itemWords.length, prodWords.length)) * 75;
              }
              
              // Bonus for similar length names
              if (Math.abs(itemName.length - prodName.length) < 5) {
                score += 5;
              }
              
              // Check for common product identifiers (GB, inch, etc.)
              const itemNumbers = itemName.match(/\d+/g) || [];
              const prodNumbers = prodName.match(/\d+/g) || [];
              const matchingNumbers = itemNumbers.filter(num => prodNumbers.includes(num)).length;
              if (matchingNumbers > 0) {
                score += matchingNumbers * 10;
              }
            }
            
            return { product: p, score };
          })
          .filter(m => m.score > 20) // Lower threshold to show more options
          .sort((a, b) => {
            // First sort by score
            if (b.score !== a.score) return b.score - a.score;
            // Then alphabetically by name
            return a.product.name.localeCompare(b.product.name);
          })
          .slice(0, 8); // Show top 8 matches
        
        matches.push({
          invoiceName: item.product_name,
          sku: item.sku,
          quantity: item.quantity || 1,
          unit_cost: item.unit_cost || 0,
          suggestions,
          selectedProduct: suggestions[0]?.product || null
        });
      }
      
      // Show confirmation dialog
      setExtractedData({
        ...extractedData,
        matchedCard,
        matchedGiftCards
      });
      setProductMatches(matches);
      setConfirmDialogOpen(true);
      setPdfFile(null);

    } catch (error) {
      toast.error('Error processing PDF: ' + error.message);
      setResult({ success: false, message: error.message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Import Orders from Email"
        description="Paste order confirmation emails from any retailer to automatically create purchase orders"
      />

      <div className="max-w-4xl grid gap-6">
        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              How to Import Orders
            </CardTitle>
            <CardDescription>
              Follow these steps to import your orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-900">Open your order confirmation email</p>
                  <p className="text-sm text-slate-600">From any retailer in your inbox</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-900">Copy the entire email</p>
                  <p className="text-sm text-slate-600">Select all text (Ctrl+A or Cmd+A) and copy (Ctrl+C or Cmd+C)</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium text-slate-900">Paste below and click Import</p>
                  <p className="text-sm text-slate-600">The system will automatically extract order details</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>Supported retailers:</strong> Amazon, Best Buy, Woot, Walmart, Target
                <br />
                <strong>Extracted data:</strong> Order number, total, items, tracking number, order date, credit card (last 4), SKU codes
                <br />
                <strong>Smart grouping:</strong> Order + shipping emails for the same order are automatically combined
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle>Import Method</CardTitle>
            <CardDescription>
              Choose to paste email text or upload a PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gmail" onClick={fetchGmailEmails}>
                  <Inbox className="h-4 w-4 mr-2" />
                  Gmail
                </TabsTrigger>
                <TabsTrigger value="paste">
                  <Mail className="h-4 w-4 mr-2" />
                  Paste Email
                </TabsTrigger>
                <TabsTrigger value="pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload PDF
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gmail" className="space-y-3 pt-3">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-slate-500 mb-1 block">From date</label>
                    <Input
                      type="date"
                      value={gmailAfterDate}
                      onChange={e => setGmailAfterDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-slate-500 mb-1 block">To date</label>
                    <Input
                      type="date"
                      value={gmailBeforeDate}
                      onChange={e => setGmailBeforeDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button size="sm" onClick={fetchGmailEmails} disabled={loadingGmail} className="h-8">
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingGmail ? 'animate-spin' : ''}`} />
                    Search
                  </Button>
                  {(gmailAfterDate || gmailBeforeDate) && (
                    <Button size="sm" variant="ghost" className="h-8 text-slate-500" onClick={() => { setGmailAfterDate(''); setGmailBeforeDate(''); }}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    Order + tracking emails grouped automatically
                    {selectedGmailIds.length > 0 && (
                      <span className="ml-2 font-semibold text-indigo-600">({selectedGmailIds.length} selected)</span>
                    )}
                  </p>
                </div>
                {loadingGmail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : gmailEmails.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No order emails found. Click Refresh to load from Gmail.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {gmailEmails.map(group => {
                      const isSelected = selectedGmailIds.includes(group.id);
                      return (
                        <div
                          key={group.id}
                          onClick={() => toggleGmailSelection(group.id)}
                          className={`border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-3 ${isSelected ? 'border-indigo-400 bg-indigo-50' : ''}`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-slate-900 truncate">{group.subject}</p>
                              {group.emailCount > 1 && (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  {group.emailCount} emails
                                </span>
                              )}
                              {group.hasTracking && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  + tracking
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{group.from}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate">{group.snippet}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {batchResults.length > 0 && (
                  <div className="space-y-1">
                    {batchResults.map((r, i) => (
                      <div key={i} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {r.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {r.subject}: {r.message}
                      </div>
                    ))}
                  </div>
                )}

                {selectedGmailIds.length > 0 && (
                  <Button
                    onClick={async () => {
                      if (selectedGmailIds.length === 0) return;
                      setProcessing(true);
                      const id = selectedGmailIds[0];
                      const group = gmailEmails.find(e => e.id === id);
                      try {
                        // Fetch all emails in the group (order + tracking) together
                        const idsToFetch = group?.ids || [id];
                        const res = idsToFetch.length > 1
                          ? await base44.functions.invoke('fetchGmailEmails', { messageIds: idsToFetch })
                          : await base44.functions.invoke('fetchGmailEmails', { messageId: id });
                        const { subject, body } = res.data || {};
                        const content = `Subject: ${subject}\n\n${body}`;

                        const extracted = await base44.integrations.Core.InvokeLLM({
                          prompt: `Extract order information from this email content from one of these retailers: Amazon, Best Buy, Woot, Walmart, or Target. 
The content may contain both an order confirmation email AND a shipping/tracking email for the same order combined together.
Extract: order number, retailer name, total cost, order date (YYYY-MM-DD format), tracking number (look in both emails), last 4 digits of credit card used, gift card codes/numbers used (if any), and list of items with product names, SKU/UPC codes, prices, and quantities.
If there are two emails for the same order, merge the data (e.g. get the tracking number from the shipping email and the items/total from the order confirmation).\n\n${content}`,
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
                            await base44.entities.PurchaseOrder.update(existingOrder.id, {
                              tracking_number: extracted.tracking_number,
                              status: 'shipped'
                            });
                            toast.success(`Tracking updated for order ${extracted.order_number}`);
                          } else {
                            toast.error(`Order ${extracted.order_number} already exists`);
                          }
                          setProcessing(false);
                          return;
                        }

                        const [allProducts, allCards, allGiftCards] = await Promise.all([
                          base44.entities.Product.list(),
                          base44.entities.CreditCard.list(),
                          base44.entities.GiftCard.list()
                        ]);

                        let matchedCard = null;
                        if (extracted.card_last_4) {
                          matchedCard = allCards.find(c => c.card_name?.includes(extracted.card_last_4));
                        }
                        const matchedGiftCards = [];
                        for (const code of extracted.gift_card_codes || []) {
                          const gc = allGiftCards.find(g => g.code && g.code.includes(code.replace(/\s+/g, '')));
                          if (gc) matchedGiftCards.push(gc);
                        }

                        const matches = [];
                        for (const item of extracted.items || []) {
                          const suggestions = allProducts
                            .map(p => {
                              let score = 0;
                              const itemName = item.product_name?.toLowerCase() || '';
                              const prodName = p.name?.toLowerCase() || '';
                              if (item.sku && p.upc === item.sku) score = 100;
                              else if (prodName === itemName) score = 95;
                              else if (prodName.includes(itemName) || itemName.includes(prodName)) score = 80;
                              else {
                                const itemWords = itemName.split(/\s+/).filter(w => w.length > 2);
                                const prodWords = prodName.split(/\s+/).filter(w => w.length > 2);
                                const matchingWords = itemWords.filter(iw => prodWords.some(pw => pw.includes(iw) || iw.includes(pw) || (Math.abs(pw.length - iw.length) <= 2 && (pw.startsWith(iw.slice(0, 3)) || iw.startsWith(pw.slice(0, 3)))))).length;
                                if (matchingWords > 0) score = (matchingWords / Math.max(itemWords.length, prodWords.length)) * 75;
                                if (Math.abs(itemName.length - prodName.length) < 5) score += 5;
                                const itemNumbers = itemName.match(/\d+/g) || [];
                                const prodNumbers = prodName.match(/\d+/g) || [];
                                score += itemNumbers.filter(num => prodNumbers.includes(num)).length * 10;
                              }
                              return { product: p, score };
                            })
                            .filter(m => m.score > 20)
                            .sort((a, b) => b.score !== a.score ? b.score - a.score : a.product.name.localeCompare(b.product.name))
                            .slice(0, 8);

                          matches.push({
                            invoiceName: item.product_name,
                            sku: item.sku,
                            quantity: item.quantity || 1,
                            unit_cost: item.unit_cost || 0,
                            suggestions,
                            selectedProduct: suggestions[0]?.product || null
                          });
                        }

                        setExtractedData({ ...extracted, matchedCard, matchedGiftCards, importSource: 'Gmail' });
                        setProductMatches(matches);
                        setConfirmDialogOpen(true);
                        setSelectedGmailIds([]);
                      } catch (err) {
                        toast.error('Failed to process email: ' + err.message);
                      } finally {
                        setProcessing(false);
                      }
                    }}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    size="lg"
                  >
                    {processing
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                      : <><Upload className="h-4 w-4 mr-2" />Review & Import Selected</>
                    }
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  placeholder="Paste your order confirmation email here..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                />
                
                <Button
                  onClick={handleParse}
                  disabled={processing || !emailContent.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Order
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-sm text-slate-600 mb-4">
                    Upload your order confirmation PDF
                  </p>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="max-w-xs mx-auto"
                  />
                  {pdfFile && (
                    <p className="text-sm text-slate-700 mt-3 font-medium">
                      Selected: {pdfFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePdfUpload}
                  disabled={processing || !pdfFile}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing PDF...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import from PDF
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.message}
                  </p>
                  {result.order && (
                    <div className="mt-2 text-sm text-green-800">
                      <p>Order #{result.order.order_number}</p>
                      <p>Total: ${result.order.total_cost}</p>
                      <p>Items: {result.order.items?.length || 0}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>  {/* end max-w-4xl */}

      {/* Product Matching Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Product Matches</DialogTitle>
            <p className="text-sm text-slate-600">
              Review and confirm the product matches before importing order {extractedData?.order_number}
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Retailer:</span>
                  <span className="ml-2 font-semibold">{extractedData?.retailer}</span>
                </div>
                <div>
                  <span className="text-slate-600">Total:</span>
                  <span className="ml-2 font-semibold">${extractedData?.total_cost?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-600">Order Date:</span>
                  <span className="ml-2 font-semibold">{extractedData?.order_date}</span>
                </div>
                <div>
                  <span className="text-slate-600">Credit Card:</span>
                  <span className="ml-2 font-semibold">{extractedData?.matchedCard?.card_name || 'None matched'}</span>
                </div>
                {extractedData?.matchedGiftCards && extractedData.matchedGiftCards.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Gift Cards Found:</span>
                    <div className="ml-2 font-semibold text-green-700">
                      {extractedData.matchedGiftCards.map((gc, i) => (
                        <div key={i}>
                          {gc.brand} - ${gc.value} ({gc.code.slice(0, 8)}...)
                        </div>
                      ))}
                      <div className="text-xs text-slate-600 mt-1">
                        Total: ${extractedData.matchedGiftCards.reduce((sum, gc) => sum + (gc.value || 0), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Products ({productMatches.length})</Label>
              {productMatches.map((match, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-white relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newMatches = productMatches.filter((_, i) => i !== index);
                      setProductMatches(newMatches);
                      toast.success('Item removed');
                    }}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                  
                  <div className="flex justify-between items-start pr-20">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">From Invoice: {match.invoiceName}</p>
                      {match.sku && (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(match.sku)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          UPC: {match.sku} (Search online)
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Qty: {match.quantity}</p>
                      <p className="text-sm font-semibold">${match.unit_cost?.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600">Match to your product:</Label>
                    <Select
                      value={match.selectedProduct?.name || ''}
                      onValueChange={(value) => {
                        const newMatches = [...productMatches];
                        const allProducts = match.suggestions.map(s => s.product);
                        newMatches[index].selectedProduct = allProducts.find(p => p.name === value) || null;
                        setProductMatches(newMatches);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {match.suggestions
                          .sort((a, b) => a.product.name.localeCompare(b.product.name))
                          .map((suggestion) => (
                            <SelectItem key={suggestion.product.id} value={suggestion.product.name}>
                              {suggestion.product.name} {suggestion.score > 90 ? '✓' : ''}
                              {suggestion.product.upc && ` (${suggestion.product.upc})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {match.suggestions.length === 0 && (
                      <p className="text-xs text-amber-600">⚠️ No matching products found - please add this product first</p>
                    )}
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={() => {
                  const newMatches = [...productMatches];
                  newMatches.push({
                    invoiceName: 'New Item',
                    sku: '',
                    quantity: 1,
                    unit_cost: 0,
                    suggestions: [],
                    selectedProduct: null
                  });
                  setProductMatches(newMatches);
                }}
                className="w-full border-dashed"
              >
                + Add Item
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmDialogOpen(false);
              setExtractedData(null);
              setProductMatches([]);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                setProcessing(true);
                try {
                  // Prepare order items - always use the product name from your list
                  const orderItems = productMatches.map(match => ({
                    product_id: match.selectedProduct?.id || '',
                    product_name: match.selectedProduct?.name || '',
                    upc: match.selectedProduct?.upc || match.sku || '',
                    quantity_ordered: match.quantity,
                    quantity_received: 0,
                    unit_cost: match.unit_cost
                  }));
                  
                  // Calculate gift card value and final cost
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
                  
                  // Mark gift cards as used
                  for (const cardId of giftCardIds) {
                    await base44.entities.GiftCard.update(cardId, {
                      status: 'used',
                      used_order_number: extractedData.order_number
                    });
                  }
                  
                  // Auto-create reward if card is selected
                  if (extractedData.matchedCard?.id && orderData.total_cost) {
                    const card = extractedData.matchedCard;
                    const amount = orderData.final_cost;
                    
                    let rewardAmount = 0;
                    let rewardType = 'cashback';
                    let currency = 'USD';
                    
                    if (card.reward_type === 'cashback' && card.cashback_rate > 0) {
                      rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
                      rewardType = 'cashback';
                      currency = 'USD';
                    } else if (card.reward_type === 'points' && card.points_rate > 0) {
                      rewardAmount = Math.round(amount * card.points_rate);
                      rewardType = 'points';
                      currency = 'points';
                    } else if (card.reward_type === 'both') {
                      if (card.cashback_rate > 0) {
                        rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
                        rewardType = 'cashback';
                        currency = 'USD';
                      } else if (card.points_rate > 0) {
                        rewardAmount = Math.round(amount * card.points_rate);
                        rewardType = 'points';
                        currency = 'points';
                      }
                    }
                    
                    if (rewardAmount > 0) {
                      await base44.entities.Reward.create({
                        credit_card_id: card.id,
                        card_name: card.card_name,
                        source: card.card_name,
                        type: rewardType,
                        purchase_amount: amount,
                        amount: parseFloat(rewardAmount),
                        currency: currency,
                        purchase_order_id: created.id,
                        order_number: extractedData.order_number,
                        date_earned: orderData.order_date,
                        status: 'pending',
                        notes: `Auto-generated from imported order ${extractedData.order_number}`
                      });
                    }
                  }
                  
                  setResult({ success: true, message: 'Order imported successfully', order: created });
                  toast.success('Order imported with rewards calculated!');
                  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
                  queryClient.invalidateQueries({ queryKey: ['giftCards'] });
                  queryClient.invalidateQueries({ queryKey: ['rewards'] });
                  setConfirmDialogOpen(false);
                  setExtractedData(null);
                  setProductMatches([]);
                } catch (error) {
                  console.error('Import error:', error);
                  setResult({ success: false, message: error.message || 'Failed to import order' });
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing || productMatches.some(m => !m.selectedProduct)}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {processing ? 'Importing...' : 'Confirm & Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}