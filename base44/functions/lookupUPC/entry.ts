import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { upc } = await req.json();
        if (!upc) return Response.json({ error: 'UPC is required' }, { status: 400 });

        const BB_KEY   = Deno.env.get('BESTBUY_API_KEY');
        const SERP_KEY = Deno.env.get('SERPAPI_KEY');

        // ── 1. UPCitemdb (fast, free) ───────────────────────────────────────
        try {
            const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'DaliaDistro/1.0' }
            });
            const d = await r.json();
            if (d.items?.[0]?.title) {
                const item = d.items[0];
                return Response.json({ title: item.title, image: item.images?.[0] || '' });
            }
        } catch {}

        // ── 2. Best Buy API ─────────────────────────────────────────────────
        if (BB_KEY) {
            try {
                const r = await fetch(
                    `https://api.bestbuy.com/v1/products(upc=${encodeURIComponent(upc)})?format=json&show=name,image,thumbnailImage&apiKey=${BB_KEY}`
                );
                const d = await r.json();
                if (d.products?.[0]?.name) {
                    const p = d.products[0];
                    return Response.json({ title: p.name, image: p.image || p.thumbnailImage || '' });
                }
            } catch {}
        }

        // ── 3. SerpApi — search UPC as product barcode ─────────────────────
        if (SERP_KEY) {
            try {
                const r = await fetch(
                    `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(upc)}+barcode+product&api_key=${SERP_KEY}`
                );
                const d = await r.json();
                const results = d.shopping_results || [];
                const electronics = ['apple','macbook','ipad','iphone','watch','airpods','samsung','fire tv','kindle','roku','nintendo','xbox','playstation','laptop','tablet','phone','earbuds','speaker','monitor','camera','starlink'];
                const best = results.find(r =>
                    electronics.some(kw => r.title?.toLowerCase().includes(kw))
                ) || results[0];
                if (best?.title) {
                    return Response.json({ title: best.title, image: best.thumbnail || '' });
                }
            } catch {}
        }

        return Response.json({ title: '', image: '' });

    } catch (error) {
        return Response.json({ error: 'Lookup failed', details: error.message }, { status: 500 });
    }
});