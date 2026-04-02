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

        const results = [];

        // ── 1. Best Buy (primary — best for electronics) ───────────────────
        if (BB_KEY) {
            try {
                const r = await fetch(
                    `https://api.bestbuy.com/v1/products(upc=${encodeURIComponent(upc)})?format=json&show=name,image,thumbnailImage,upc&apiKey=${BB_KEY}`
                );
                const text = await r.text();
                console.log('BB response:', text.slice(0, 300));
                const d = JSON.parse(text);
                if (d.products?.length > 0) {
                    d.products.slice(0, 3).forEach(p => {
                        results.push({ title: p.name, image: p.image || p.thumbnailImage || '', source: 'Best Buy' });
                    });
                }
            } catch (e) {
                console.log('BB error:', e.message);
            }
        }

        // ── 2. UPCitemdb (fallback — good for common items) ────────────────
        try {
            const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'DaliaDistro/1.0' }
            });
            const d = await r.json();
            if (d.items?.length > 0) {
                d.items.slice(0, 3).forEach(item => {
                    results.push({ title: item.title, image: item.images?.[0] || '', source: 'UPCitemdb' });
                });
            }
        } catch {}

        // ── 3. SerpApi — Google Shopping (last resort) ─────────────────────
        if (SERP_KEY) {
            try {
                const r = await fetch(
                    `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(upc)}&api_key=${SERP_KEY}`
                );
                const d = await r.json();
                console.log('SerpApi response:', JSON.stringify(d).slice(0, 300));
                const items = d.shopping_results || [];
                items.slice(0, 3).forEach(item => {
                    results.push({ title: item.title, image: item.thumbnail || '', source: 'Google' });
                });
            } catch (e) {
                console.log('SerpApi error:', e.message);
            }
        }

        // ── Deduplicate by title similarity ────────────────────────────────
        const seen = new Set();
        const deduped = results.filter(r => {
            const key = r.title?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const top = deduped[0] || {};
        return Response.json({ title: top.title || '', image: top.image || '', results: deduped });

    } catch (error) {
        return Response.json({ error: 'Lookup failed', details: error.message }, { status: 500 });
    }
});