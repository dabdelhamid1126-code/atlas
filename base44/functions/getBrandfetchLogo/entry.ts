import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { company } = await req.json();

    if (!company) {
      return Response.json({ error: 'Company name required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('BRANDFETCH');
    if (!apiKey) {
      return Response.json({ error: 'Brandfetch API key not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.brandfetch.io/v2/search?query=${encodeURIComponent(company)}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch from Brandfetch' }, { status: response.status });
    }

    const data = await response.json();
    const result = data.length > 0 ? data[0] : null;
    
    if (!result) {
      return Response.json({ logoUrl: null });
    }

    const logoUrl = result.icon || result.logo || null;
    return Response.json({ logoUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});