import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { upc } = await req.json();

        if (!upc) {
            return Response.json({ error: 'UPC is required' }, { status: 400 });
        }

        // Call barcodelookup.com API
        const response = await fetch(`https://api.barcodelookup.com/v3/products?barcode=${upc}&formatted=y&key=${Deno.env.get('BARCODE_LOOKUP_API_KEY')}`);

        if (!response.ok) {
            return Response.json({ 
                error: 'Failed to lookup UPC',
                status: response.status 
            }, { status: response.status });
        }

        const data = await response.json();

        // Extract relevant product information
        const product = data.products?.[0];
        
        if (!product) {
            return Response.json({ 
                error: 'Product not found',
                upc 
            }, { status: 404 });
        }

        return Response.json({
            upc: product.barcode_number,
            title: product.title,
            description: product.description,
            brand: product.brand,
            category: product.category,
            image: product.images?.[0],
            manufacturer: product.manufacturer,
            model: product.model
        });

    } catch (error) {
        console.error('Error in lookupUPC:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});