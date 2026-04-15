// api/auth/google.js
// Redirects user to Google OAuth consent screen

export default function handler(req, res) {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/auth/google/callback`;
  const userEmail    = req.query.user_email || '';

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         scopes,
    access_type:   'offline',
    prompt:        'consent',
    state:         userEmail, // pass atlas user email through OAuth flow
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
