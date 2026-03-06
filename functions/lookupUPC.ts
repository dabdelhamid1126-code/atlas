import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

        // Try UPCitemdb lookup endpoint (works better than trial)
        const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FalconFlips/1.0'
            }
        });

        if (!response.ok) {
            // Fallback: try Open Food Facts for any product
            const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(upc)}.json`);
            const offData = await offRes.json();
            if (offData.status === 1 && offData.product) {
                const p = offData.product;
                return Response.json({
                    title: p.product_name || p.product_name_en || null,
                    image: p.image_url || null
                });
            }
            return Response.json({ error: 'Product not found. Please enter manually.' }, { status: 404 });
        }

        const data = await response.json();
        
        if (data.code === 'OK' && data.items && data.items.length > 0) {
            const item = data.items[0];
            return Response.json({
                title: item.title || null,
                image: item.images?.[0] || null
            });
        }

        // Fallback: Open Food Facts
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(upc)}.json`);
        const offData = await offRes.json();
        if (offData.status === 1 && offData.product) {
            const p = offData.product;
            return Response.json({
                title: p.product_name || p.product_name_en || null,
                image: p.image_url || null
            });
        }

        return Response.json({ error: 'Product not found. Please enter manually.' }, { status: 404 });

    } catch (error) {
        return Response.json({ 
            error: 'Product not found. Please enter manually.',
            details: error.message
        }, { status: 500 });
    }
});