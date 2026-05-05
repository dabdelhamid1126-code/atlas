// api/auth/discord.js
// Redirects user to Discord OAuth consent screen

export default function handler(req, res) {
  const clientId     = process.env.DISCORD_CLIENT_ID;
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/auth/discord/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'identify email',
    prompt:        'consent',
  });

  res.redirect(`https://discord.com/oauth/authorize?${params}`);
}
