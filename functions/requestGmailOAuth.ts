import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request Gmail OAuth authorization with required scopes
    // Base44 will handle the OAuth popup/redirect
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Request authorization from Base44
    // This will trigger the OAuth flow for the app builder
    const result = await base44.functions.invoke('_requestOAuthAuthorization', {
      integration_type: 'gmail',
      scopes: scopes,
      reason: 'To read order confirmation emails from your Gmail inbox'
    });

    if (result?.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    // After successful authorization, return success
    return Response.json({
      success: true,
      message: 'Gmail authorization successful'
    });
  } catch (error) {
    console.error('Gmail OAuth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});