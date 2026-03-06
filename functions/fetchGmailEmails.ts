import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { messageId, messageIds } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

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
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
      return '';
    };

    const fetchFullMessage = async (id) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      let bodyText = '';
      if (msg.payload?.body?.data) {
        bodyText = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else {
        bodyText = getBody(msg.payload?.parts || []);
      }
      return { subject, from, date, body: bodyText };
    };

    // Fetch a single message
    if (messageId) {
      const result = await fetchFullMessage(messageId);
      return Response.json(result);
    }

    // Fetch multiple messages and combine their bodies
    if (messageIds && Array.isArray(messageIds)) {
      const results = await Promise.all(messageIds.map(id => fetchFullMessage(id)));
      const combined = results.map(r => `--- EMAIL: ${r.subject} (${r.date}) ---\n${r.body}`).join('\n\n');
      return Response.json({
        subject: results[0]?.subject || '',
        from: results[0]?.from || '',
        date: results[0]?.date || '',
        body: combined
      });
    }

    // Fetch list of order emails from target retailers only
    // Two query types: order confirmations + shipping/tracking emails
    const { afterDate, beforeDate } = body;
    const retailers = 'from:(amazon OR bestbuy OR "best buy" OR woot OR walmart OR target)';
    // Build date range filter: Gmail uses after:YYYY/MM/DD before:YYYY/MM/DD
    let dateFilter = '';
    if (afterDate) dateFilter += ` after:${afterDate.replace(/-/g, '/')}`;
    if (beforeDate) dateFilter += ` before:${beforeDate.replace(/-/g, '/')}`;
    const baseFilter = dateFilter || ' newer_than:90d';

    const orderQuery = `${retailers} subject:(("order confirmation") OR ("order placed") OR ("order receipt") OR ("thanks for your order") OR ("thank you for your order") OR ("your order") OR ("order #") OR ("order number"))${baseFilter} -category:promotions`;
    const trackingQuery = `${retailers} subject:((shipped OR "tracking number" OR "out for delivery" OR "on the way" OR "package shipped" OR "order shipped"))${baseFilter} -category:promotions`;

    const [orderListRes, trackingListRes] = await Promise.all([
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(orderQuery)}&maxResults=40`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(trackingQuery)}&maxResults=40`, { headers: { Authorization: `Bearer ${accessToken}` } })
    ]);

    const [orderListData, trackingListData] = await Promise.all([
      orderListRes.json(),
      trackingListRes.json()
    ]);

    // Merge message IDs, deduplicate
    const allIds = new Map();
    for (const m of (orderListData.messages || [])) allIds.set(m.id, { ...m, type: 'order' });
    for (const m of (trackingListData.messages || [])) {
      if (!allIds.has(m.id)) allIds.set(m.id, { ...m, type: 'tracking' });
    }

    // Fetch metadata for all
    const emails = await Promise.all(
      Array.from(allIds.values()).map(async (m) => {
        const r = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await r.json();
        const headers = data.payload?.headers || [];
        return {
          id: m.id,
          type: m.type,
          subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
          from: headers.find(h => h.name === 'From')?.value || '',
          date: headers.find(h => h.name === 'Date')?.value || '',
          snippet: data.snippet || ''
        };
      })
    );

    // Group by order number extracted from subject/snippet
    // Group emails that appear to be about the same order
    // Heuristic: same sender domain + same order number pattern in subject
    const extractOrderNum = (subject, snippet) => {
      const text = `${subject} ${snippet}`;
      const match = text.match(/(?:order\s*#?\s*|#)([A-Z0-9\-]{6,})/i);
      return match ? match[1].toUpperCase() : null;
    };

    const groups = [];
    const usedIds = new Set();

    // Sort: order emails first, then tracking
    const sorted = [...emails].sort((a, b) => {
      if (a.type === 'order' && b.type !== 'order') return -1;
      if (b.type === 'order' && a.type !== 'order') return 1;
      return new Date(b.date) - new Date(a.date);
    });

    for (const email of sorted) {
      if (usedIds.has(email.id)) continue;
      const orderNum = extractOrderNum(email.subject, email.snippet);
      const senderDomain = email.from.match(/@([\w.]+)/)?.[1] || '';
      
      // Find related emails (same order number or same sender within 7 days)
      const related = emails.filter(other => {
        if (other.id === email.id || usedIds.has(other.id)) return false;
        const otherNum = extractOrderNum(other.subject, other.snippet);
        const otherDomain = other.from.match(/@([\w.]+)/)?.[1] || '';
        if (orderNum && otherNum && orderNum === otherNum) return true;
        return false;
      });

      const groupEmails = [email, ...related];
      groupEmails.forEach(e => usedIds.add(e.id));

      const hasTracking = groupEmails.some(e => e.type === 'tracking');
      const primarySubject = groupEmails.find(e => e.type === 'order')?.subject || email.subject;

      groups.push({
        id: email.id,
        ids: groupEmails.map(e => e.id),
        subject: primarySubject,
        from: email.from,
        date: email.date,
        snippet: email.snippet,
        emailCount: groupEmails.length,
        hasTracking,
        emails: groupEmails
      });
    }

    // Sort groups by date desc
    groups.sort((a, b) => new Date(b.date) - new Date(a.date));

    return Response.json({ emails: groups });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});