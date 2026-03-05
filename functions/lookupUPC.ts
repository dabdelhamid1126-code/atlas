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
            return Response.json({ 
                error: 'UPC is required' 
            }, { status: 400 });
        }

        const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
        const data = await response.json();
        
        if (data.code === 'OK' && data.items && data.items.length > 0) {
            const item = data.items[0];
            return Response.json({
                title: item.title || null,
                image: item.images?.[0] || null
            });
        } else {
            return Response.json({ 
                error: 'Product not found. Please enter manually.' 
            }, { status: 404 });
        }
    } catch (error) {
        return Response.json({ 
            error: 'Product not found. Please enter manually.' 
        }, { status: 500 });
    }
});