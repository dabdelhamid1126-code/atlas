import { createClientFromRequest } from '@base44/sdk@0.8.25';

export default async function discordCallback(req, res) {
  try {
    const base44 = createClientFromRequest(req);
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    // Exchange code for token with Discord
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.BASE_URL}/api/auth/discord/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      return res.status(400).json({ error: 'Failed to get token' });
    }

    const { access_token } = await tokenResponse.json();

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = await userResponse.json();

    // Create or find user in Base44
    const user = await base44.entities.User.create({
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      email: discordUser.email,
      discord_avatar: discordUser.avatar,
    });

    // Redirect with auth token
    return res.redirect(`/?access_token=${access_token}`);
  } catch (error) {
    console.error('Discord callback error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}