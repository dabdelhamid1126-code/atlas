import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { domain } = await req.json();

    if (!domain) {
      return Response.json({ error: 'Domain required' }, { status: 400 });
    }

    // Get API key from Base44 Secrets (ISSUE #1 FIX!)
    // API key is NEVER exposed to frontend
    const apiKey = Deno.env.get('BRANDFETCH_API_KEY');
    
    if (!apiKey) {
      console.error('BRANDFETCH_API_KEY not configured in Secrets');
      return Response.json(
        { error: 'Logo service unavailable' }, 
        { status: 503 }
      );
    }

    // Call Brandfetch API with the secret key
    const logoUrl = `https://cdn.brandfetch.io/domain/${domain}?c=${apiKey}`;
    
    return Response.json({ logoUrl });
  } catch (error) {
    console.error('Logo fetch error:', error);
    return Response.json({ error: 'Failed to fetch logo' }, { status: 500 });
  }
});
