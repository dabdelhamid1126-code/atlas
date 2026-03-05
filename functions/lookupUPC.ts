import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const upc = body?.upc;

        if (!upc) {
            return Response.json({ error: 'UPC is required' }, { status: 400 });
        }

        console.log(`[lookupUPC] Looking up UPC: ${upc}`);

        const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FalconFlips/1.0'
            }
        });

        console.log(`[lookupUPC] UPCitemDB response status: ${response.status}`);

        const data = await response.json();
        console.log(`[lookupUPC] Response code: ${data.code}, items: ${data.items?.length || 0}`);

        if (data.code === 'OK' && data.items && data.items.length > 0) {
            const item = data.items[0];
            return Response.json({
                title: item.title || null,
                image: item.images?.[0] || null
            });
        } else if (data.code === 'EXCEED_LIMIT') {
            return Response.json({ error: 'Rate limit exceeded. Please try again in a moment.' }, { status: 429 });
        } else {
            return Response.json({
                error: 'Product not found. Please enter manually.'
            }, { status: 404 });
        }
    } catch (error) {
        console.error(`[lookupUPC] Error: ${error.message}`);
        return Response.json({
            error: 'Product not found. Please enter manually.',
            details: error.message
        }, { status: 500 });
    }
});