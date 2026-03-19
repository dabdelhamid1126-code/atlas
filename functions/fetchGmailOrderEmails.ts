import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Gmail connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    if (!accessToken) {
      return Response.json({ error: 'Gmail not connected' }, { status: 400 });
    }

    const body = await req.json();
    const { from, to, maxResults = 50 } = body;

    // Build Gmail API query
    // Search for order confirmation emails
    const searchQuery = [
      'subject:(order confirmation OR order placed OR order receipt)',
      from ? `after:${from.replace(/-/g, '')}` : '',
      to ? `before:${to.replace(/-/g, '')}` : ''
    ].filter(Boolean).join(' ');

    // Fetch emails from Gmail API
    const messagesResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!messagesResponse.ok) {
      return Response.json({ error: 'Failed to fetch emails' }, { status: 400 });
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    // Fetch full message details for each
    const emails = [];
    for (const msg of messages.slice(0, maxResults)) {
      try {
        const msgResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (msgResponse.ok) {
          const msgData = await msgResponse.json();
          const headers = msgData.payload.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';
          
          let body = '';
          if (msgData.payload.parts) {
            const textPart = msgData.payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
          } else if (msgData.payload.body?.data) {
            body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }

          emails.push({
            id: msg.id,
            subject,
            from,
            date,
            body,
            snippet: msgData.snippet || ''
          });
        }
      } catch (e) {
        console.error(`Error fetching message ${msg.id}:`, e);
      }
    }

    return Response.json({ emails });
  } catch (error) {
    console.error('Gmail fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});