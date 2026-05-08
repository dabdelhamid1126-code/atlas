import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { upc } = await req.json();
    if (!upc) return Response.json({ error: 'UPC required' }, { status: 400 });

    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return Response.json({ error: `UPCitemdb error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});