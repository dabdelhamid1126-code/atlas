import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { upc } = await req.json();
        if (!upc) {
            return Response.json({ error: 'UPC is required' }, { status: 400 });
        }

        const BESTBUY_API_KEY = Deno.env.get('BESTBUY_API_KEY');

        // ── 1. Best Buy API (best quality for electronics) ──────────────────
        if (BESTBUY_API_KEY) {
            try {
                const bbRes = await fetch(
                    `https://api.bestbuy.com/v1/products(upc=${encodeURIComponent(upc)})?format=json&show=name,salePrice,image,thumbnailImage&apiKey=${BESTBUY_API_KEY}`
                );
                if (bbRes.ok) {
                    const bbData = await bbRes.json();
                    if (bbData.products && bbData.products.length > 0) {
                        const p = bbData.products[0];
                        return Response.json({
                            title: p.name || null,
                            image: p.image || p.thumbnailImage || null,
                            price: p.salePrice || null,
                            source: 'bestbuy'
                        });
                    }
                }
            } catch {}
        }

        // ── 2. UPCitemdb ────────────────────────────────────────────────────
        try {
            const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'DaliaDistro/1.0' }
            });
            if (upcRes.ok) {
                const upcData = await upcRes.json();
                if (upcData.code === 'OK' && upcData.items?.length > 0) {
                    const item = upcData.items[0];
                    return Response.json({
                        title: item.title || null,
                        image: item.images?.[0] || null,
                        source: 'upcitemdb'
                    });
                }
            }
        } catch {}

        // ── 3. Open Food Facts ──────────────────────────────────────────────
        try {
            const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(upc)}.json`);
            const offData = await offRes.json();
            if (offData.status === 1 && offData.product) {
                const p = offData.product;
                return Response.json({
                    title: p.product_name || p.product_name_en || null,
                    image: p.image_url || null,
                    source: 'openfoodfacts'
                });
            }
        } catch {}

        return Response.json({ error: 'Product not found. Please enter manually.' }, { status: 404 });

    } catch (error) {
        return Response.json({
            error: 'Product not found. Please enter manually.',
            details: error.message
        }, { status: 500 });
    }
});