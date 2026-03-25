import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, scopes } = body;

    if (action === 'authorize') {
      // In the real implementation, this would use Base44's 
      // request_oauth_authorization tool from the platform
      // For now, we return a message that the authorization was requested
      // The actual OAuth flow is handled by the platform
      return Response.json({
        success: true,
        message: 'Gmail authorization requested - please complete OAuth consent flow'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Gmail OAuth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});