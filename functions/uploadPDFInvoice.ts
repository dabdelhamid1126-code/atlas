import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // For now, we'll use the extraction integration to parse PDF
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: await uploadFileBuffer(buffer, base44),
      json_schema: {
        type: 'object',
        properties: {
          order_number: { type: 'string' },
          order_date: { type: 'string' },
          retailer: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                quantity: { type: 'number' },
                unit_price: { type: 'number' },
                total: { type: 'number' }
              }
            }
          },
          subtotal: { type: 'number' },
          tax: { type: 'number' },
          total: { type: 'number' }
        }
      }
    });

    if (result.status === 'success') {
      return Response.json({
        success: true,
        ordersFound: result.output?.order_number ? 1 : 0,
        data: result.output
      });
    } else {
      return Response.json({
        success: false,
        error: result.details || 'Failed to parse PDF'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('PDF upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function uploadFileBuffer(buffer, base44) {
  // Convert buffer to File-like object
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const result = await base44.integrations.Core.UploadFile({ file: blob });
  return result.file_url;
}