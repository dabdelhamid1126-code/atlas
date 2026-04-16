// api/auth/google/callback.js
// Handles OAuth callback, exchanges code for tokens, stores in Supabase

export default async function handler(req, res) {
  const { code, state: userEmail, error } = req.query;

  if (error) {
    return res.redirect(`https://daliadistrollcflip.com/ImportOrders?gmail_error=${error}`);
  }

  if (!code) {
    return res.redirect(`https://daliadistrollcflip.com/ImportOrders?gmail_error=no_code`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return res.redirect(`https://daliadistrollcflip.com/ImportOrders?gmail_error=token_exchange`);
    }

    // Get the Gmail address from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const gmailAddress = userInfo.email;

    // Store tokens in Supabase using service key (bypasses RLS)
    const supabaseRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/gmail_tokens`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer':        'resolution=merge-duplicates', // upsert by user_email
        },
        body: JSON.stringify({
          user_email:    userEmail,   // atlas user email
          gmail_address: gmailAddress, // connected Gmail address
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expires_at:    Date.now() + (tokens.expires_in * 1000),
        }),
      }
    );

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text();
      console.error('Supabase store error:', err);
      return res.redirect(`https://daliadistrollcflip.com/ImportOrders?gmail_error=store_failed`);
    }

    // Success — redirect back to base44 app Import page
    res.redirect(`https://daliadistrollcflip.com/ImportOrders?gmail_connected=${encodeURIComponent(gmailAddress)}`);

  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`https://daliadistrollcflip.com/ImportOrders?gmail_error=unknown`);
  }
}
