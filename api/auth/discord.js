// api/auth/discord.js
// Redirects user to Discord OAuth consent screen

export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/discord/callback`;
  const userEmail = req.query.user_email || '';
  
  // Discord scopes
  const scopes = [
    'identify',        // Get user's Discord ID and username
    'email',          // Get user's email
  ].join('%20');      // URL encoded space

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    state: userEmail,  // pass atlas user email through OAuth flow
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}