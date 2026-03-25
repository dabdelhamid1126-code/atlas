import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Try to get the Gmail connection
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

      if (!accessToken) {
        return Response.json({ connected: false });
      }

      // Fetch user's email from Gmail API
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/profile',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const profile = await response.json();
        return Response.json({
          connected: true,
          email: profile.emailAddress || ''
        });
      }

      return Response.json({ connected: false });
    } catch (e) {
      // Connection not available
      return Response.json({ connected: false });
    }
  } catch (error) {
    console.error('Gmail status check error:', error);
    return Response.json({ connected: false });
  }
});