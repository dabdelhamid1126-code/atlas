import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch deals from the external deals API
    const response = await fetch('https://selvora.app/api/deals/products', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      return Response.json({
        products: [],
        fetchedAt: new Date().toISOString(),
        nextRefreshAt: null,
        stale: false,
        itemCount: 0,
        lastFetchError: `HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});