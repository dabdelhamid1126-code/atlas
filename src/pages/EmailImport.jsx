import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Upload, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
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
  const queryClient = useQueryClient();

  const handleParse = async () => {
    if (!emailContent.trim()) {
      toast.error('Please paste email content');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await base44.functions.parseOrderEmail({
        emailSubject: emailContent.substring(0, 200),
        emailBody: emailContent,
        emailHtml: emailContent
      });

      setResult(response);
      
      if (response.success) {
        toast.success('Order imported successfully!');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        setEmailContent('');
      } else {
        toast.error(response.message || 'Failed to parse email');
      }
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
        prompt: `Extract order information from this order confirmation (any retailer). Extract: order number, retailer name, total cost, order date (YYYY-MM-DD format), tracking number if available, last 4 digits of credit card used, and list of items with product names, SKU/UPC codes, prices, and quantities. Return the exact order number as shown in the document.`,
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

      // Get all products and credit cards to match
      const allProducts = await base44.entities.Product.list();
      const allCards = await base44.entities.CreditCard.list();

      // Match credit card by last 4 digits
      let matchedCard = null;
      if (extractedData.card_last_4) {
        matchedCard = allCards.find(card => 
          card.card_name?.includes(extractedData.card_last_4)
        );
      }

      // Find product matches and suggestions, and look up UPC details
      const matches = [];
      
      for (const item of extractedData.items || []) {
        // Look up product details by UPC if available
        let upcLookupData = null;
        if (item.sku) {
          try {
            const { data: lookupResult } = await base44.functions.invoke('lookupUPC', { upc: item.sku });
            upcLookupData = lookupResult;
          } catch (error) {
            console.error('UPC lookup failed:', error);
          }
        }
        
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
          selectedProduct: suggestions[0]?.product || null,
          upcLookupData
        });
      }
      
      // Show confirmation dialog
      setExtractedData({
        ...extractedData,
        matchedCard
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

      <div className="grid gap-6 max-w-4xl">
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
                <strong>Supported retailers:</strong> All retailers (Amazon, Best Buy, Walmart, Target, etc.)
                <br />
                <strong>Extracted data:</strong> Order number, total, items, tracking number, order date, credit card (last 4), SKU codes
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">
                  <Mail className="h-4 w-4 mr-2" />
                  Paste Email
                </TabsTrigger>
                <TabsTrigger value="pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload PDF
                </TabsTrigger>
              </TabsList>

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
      </div>

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
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Products ({productMatches.length})</Label>
              {productMatches.map((match, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">From Invoice: {match.invoiceName}</p>
                      {match.sku && <p className="text-xs text-slate-500">SKU: {match.sku}</p>}
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
                  
                  const orderData = {
                    order_number: extractedData.order_number,
                    retailer: extractedData.retailer || 'Unknown',
                    tracking_number: extractedData.tracking_number || '',
                    credit_card_id: extractedData.matchedCard?.id || null,
                    card_name: extractedData.matchedCard?.card_name || null,
                    status: extractedData.tracking_number ? 'shipped' : 'ordered',
                    order_date: extractedData.order_date || format(new Date(), 'yyyy-MM-dd'),
                    items: orderItems,
                    total_cost: extractedData.total_cost || 0,
                    final_cost: extractedData.total_cost || 0,
                    notes: 'Imported from PDF'
                  };
                  
                  const created = await base44.entities.PurchaseOrder.create(orderData);
                  
                  setResult({ success: true, message: 'Order imported successfully', order: created });
                  toast.success('Order imported successfully!');
                  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
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