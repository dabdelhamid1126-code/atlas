// api/gmail/sync.js
// Fetches order confirmation emails from Gmail for a given user

const ORDER_QUERIES = [
  'from:auto-confirm@amazon.com subject:"order confirmation"',
  'from:@bestbuy.com subject:"order"',
  'from:@walmart.com subject:"order"',
  'from:@samsclub.com subject:"order"',
  'from:@target.com subject:"order"',
  'from:@costco.com subject:"order"',
  'from:@apple.com subject:"order"',
  'from:@staples.com subject:"order"',
  'subject:"order confirmation" (from:amazon OR from:bestbuy OR from:walmart OR from:target OR from:costco OR from:apple OR from:staples OR from:samsclub)',
];

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

async function getEmailBody(messageId, accessToken) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  // Extract body — try html first, then plain text
  const parts = data.payload?.parts || [];
  let body = '';

  const findBody = (parts) => {
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const nested = findBody(part.parts);
        if (nested) return nested;
      }
    }
    // fallback to plain text
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    return '';
  };

  if (parts.length > 0) {
    body = findBody(parts);
  } else if (data.payload?.body?.data) {
    body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
  }

  // Extract headers
  const headers = {};
  (data.payload?.headers || []).forEach(h => {
    headers[h.name.toLowerCase()] = h.value;
  });

  return {
    id:       messageId,
    subject:  headers['subject'] || '',
    from:     headers['from']    || '',
    date:     headers['date']    || '',
    snippet:  data.snippet       || '',
    body,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_email, days_back = 30, max_emails = 20 } = req.body;

  if (!user_email) {
    return res.status(400).json({ error: 'user_email is required' });
  }

  try {
    // Fetch stored tokens from Supabase
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

    if (!tokens.length) {
      return res.status(401).json({ error: 'Gmail not connected' });
    }

    let { access_token, refresh_token, expires_at, gmail_address } = tokens[0];

    // Refresh token if expired
    if (Date.now() > expires_at - 60000) {
      const refreshed = await refreshAccessToken(refresh_token);
      if (refreshed.error) {
        return res.status(401).json({ error: 'Token refresh failed — reconnect Gmail' });
      }
      access_token = refreshed.access_token;
      const new_expires = Date.now() + (refreshed.expires_in * 1000);

      // Update stored token
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/gmail_tokens?user_email=eq.${encodeURIComponent(user_email)}`,
        {
          method:  'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ access_token, expires_at: new_expires }),
        }
      );
    }

    // Build Gmail search query
    const afterDate = Math.floor((Date.now() - days_back * 86400000) / 1000);
    const query     = `(${ORDER_QUERIES.join(' OR ')}) after:${afterDate}`;

    // Search Gmail
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${max_emails}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const searchData = await searchRes.json();
    const messages   = searchData.messages || [];

    if (!messages.length) {
      return res.status(200).json({ emails: [], gmail_address, count: 0 });
    }

    // Fetch full body for each email (limit to 10 to avoid timeout)
    const emailsToFetch = messages.slice(0, 10);
    const emails = await Promise.all(
      emailsToFetch.map(m => getEmailBody(m.id, access_token))
    );

    return res.status(200).json({
      emails,
      gmail_address,
      count: emails.length,
      total_found: messages.length,
    });

  } catch (err) {
    console.error('Gmail sync error:', err);
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
}
