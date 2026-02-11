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

export default function EmailImport() {
  const [emailContent, setEmailContent] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
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

      // Fetch the PDF content
      const response = await fetch(file_url);
      const text = await response.text();

      // Parse the email
      const parseResponse = await base44.functions.parseOrderEmail({
        emailSubject: pdfFile.name,
        emailBody: text,
        emailHtml: text
      });

      setResult(parseResponse);
      
      if (parseResponse.success) {
        toast.success('Order imported successfully!');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        setPdfFile(null);
      } else {
        toast.error(parseResponse.message || 'Failed to parse PDF');
      }
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
        description="Paste Best Buy or Amazon order confirmation emails to automatically create purchase orders"
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
                  <p className="text-sm text-slate-600">From Best Buy or Amazon in your inbox</p>
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
                <strong>Supported retailers:</strong> Amazon, Best Buy
                <br />
                <strong>Extracted data:</strong> Order number, total, items, tracking number, order date
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
                  placeholder="Paste your Best Buy or Amazon order confirmation email here..."
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
    </div>
  );
}