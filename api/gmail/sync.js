// api/gmail/sync.js
// Per-user Gmail sync using tokens stored in Supabase

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type:    'refresh_token',
    }),
  });
  return res.json();
}

function findBody(parts) {
  if (!parts?.length) return '';
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) {
      const nested = findBody(part.parts);
      if (nested) return nested;
    }
  }
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

async function getEmailMetadata(messageId, accessToken) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  const headers = data.payload?.headers || [];
  return {
    id:      messageId,
    subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
    from:    headers.find(h => h.name === 'From')?.value    || '',
    date:    headers.find(h => h.name === 'Date')?.value    || '',
    snippet: data.snippet || '',
  };
}

async function getEmailBody(messageId, accessToken) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  const headers = data.payload?.headers || [];
  let body = '';
  if (data.payload?.body?.data) {
    body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
  } else {
    body = findBody(data.payload?.parts || []);
  }
  return {
    id:      messageId,
    subject: headers.find(h => h.name === 'Subject')?.value || '',
    from:    headers.find(h => h.name === 'From')?.value    || '',
    date:    headers.find(h => h.name === 'Date')?.value    || '',
    snippet: data.snippet || '',
    body,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_email, days_back = 30, max_emails = 50, message_ids } = req.body;

  if (!user_email) {
    return res.status(400).json({ error: 'user_email is required' });
  }

  try {
    // Get tokens from Supabase
    const tokenRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/gmail_tokens?user_email=eq.${encodeURIComponent(user_email)}&select=*`,
      {
        headers: {
          'apikey':        process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const tokens = await tokenRes.json();
    if (!tokens?.length) {
      return res.status(401).json({ error: 'Gmail not connected' });
    }

    let { access_token, refresh_token, expires_at, gmail_address } = tokens[0];

    // Refresh if expired
    if (Date.now() > expires_at - 60000) {
      const refreshed = await refreshAccessToken(refresh_token);
      if (refreshed.error) {
        return res.status(401).json({ error: 'Token expired — please reconnect Gmail' });
      }
      access_token = refreshed.access_token;
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/gmail_tokens?user_email=eq.${encodeURIComponent(user_email)}`,
        {
          method:  'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ access_token, expires_at: Date.now() + (refreshed.expires_in * 1000) }),
        }
      );
    }

    // ── Fetch bodies for specific message IDs (import mode) ───────────────
    if (message_ids && Array.isArray(message_ids)) {
      const results  = await Promise.all(message_ids.map(id => getEmailBody(id, access_token)));
      const combined = results.map(r => `--- EMAIL: ${r.subject} (${r.date}) ---\n${r.body}`).join('\n\n');
      return res.status(200).json({
        subject:       results[0]?.subject || '',
        from:          results[0]?.from    || '',
        date:          results[0]?.date    || '',
        body:          combined,
        gmail_address,
      });
    }

    // ── Search for order emails (scan mode) ───────────────────────────────
    const afterDate  = Math.floor((Date.now() - days_back * 86400000) / 1000);
    const orderQuery = `subject:("order confirmation" OR "order placed" OR "order receipt" OR "thanks for your order" OR "thank you for your order" OR "your order" OR "order #" OR "order number" OR "purchase confirmation" OR "ready for pickup" OR "ready to pick up" OR "order ready" OR "pickup ready" OR "available for pickup" OR "curbside" OR "picked up") after:${afterDate} -category:promotions -category:social`;
    const trackQuery = `subject:(shipped OR "tracking number" OR "out for delivery" OR "on the way" OR "package shipped" OR "order shipped" OR "delivery") after:${afterDate} -category:promotions -category:social`;

    const [orderRes, trackRes] = await Promise.all([
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(orderQuery)}&maxResults=${max_emails}`, { headers: { Authorization: `Bearer ${access_token}` } }),
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(trackQuery)}&maxResults=${max_emails}`,  { headers: { Authorization: `Bearer ${access_token}` } }),
    ]);

    const [orderData, trackData] = await Promise.all([orderRes.json(), trackRes.json()]);

    const allIds = new Map();
    for (const m of (orderData.messages || [])) allIds.set(m.id, m);
    for (const m of (trackData.messages  || [])) { if (!allIds.has(m.id)) allIds.set(m.id, m); }

    if (!allIds.size) {
      return res.status(200).json({ emails: [], gmail_address, count: 0 });
    }

    const ids    = Array.from(allIds.keys()).slice(0, 30);
    const emails = await Promise.all(ids.map(id => getEmailMetadata(id, access_token)));

    return res.status(200).json({ emails, gmail_address, count: emails.length, total_found: allIds.size });

  } catch (err) {
    console.error('Gmail sync error:', err);
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
}
