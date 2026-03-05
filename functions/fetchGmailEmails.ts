import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { messageId } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // If messageId provided, fetch full message body
    if (messageId) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msg = await msgRes.json();

      const headers = msg.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extract body text (plain or html)
      const getBody = (parts) => {
        if (!parts) return '';
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
          if (part.parts) {
            const nested = getBody(part.parts);
            if (nested) return nested;
          }
        }
        // fallback to html
        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
        return '';
      };

      let bodyText = '';
      if (msg.payload?.body?.data) {
        bodyText = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else {
        bodyText = getBody(msg.payload?.parts || []);
      }

      return Response.json({ subject, from, date, body: bodyText });
    }

    // Only fetch actual order confirmation emails, not promotions
    const query = 'subject:(("order confirmation") OR ("order placed") OR ("order receipt") OR ("purchase confirmation") OR ("thanks for your order") OR ("thank you for your order") OR ("your order of") OR ("your recent order")) newer_than:180d -category:promotions';
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    const messages = listData.messages || [];

    // Fetch snippet + subject for each
    const emails = await Promise.all(
      messages.map(async (m) => {
        const r = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await r.json();
        const headers = data.payload?.headers || [];
        return {
          id: m.id,
          subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
          from: headers.find(h => h.name === 'From')?.value || '',
          date: headers.find(h => h.name === 'Date')?.value || '',
          snippet: data.snippet || ''
        };
      })
    );

    return Response.json({ emails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});