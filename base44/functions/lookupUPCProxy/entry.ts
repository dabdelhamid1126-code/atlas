import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // No auth required — only calls external UPCitemdb API

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
});