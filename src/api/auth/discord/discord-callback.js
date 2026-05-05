// api/auth/discord/callback.js
// Handles Discord OAuth callback, exchanges code for tokens, and logs user into Base44

export default async function handler(req, res) {
  const { code, error, state } = req.query;

  if (error) {
    return res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=${error}`);
  }

  if (!code) {
    return res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=no_code`);
  }

  try {
    // Step 1: Exchange authorization code for Discord access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  `${process.env.NEXTAUTH_URL}/api/auth/discord/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Discord token exchange error:', tokenData);
      return res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=token_exchange`);
    }

    // Step 2: Fetch user info from Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const discordUser = await userRes.json();

    if (!discordUser.id) {
      console.error('Discord user fetch failed:', discordUser);
      return res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=user_fetch`);
    }

    // Step 3: Call your Base44 backend function to create/update user and get session
    const backendRes = await fetch(
      `${process.env.BASE44_FUNCTION_URL}/discordLogin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': process.env.BASE44_API_KEY,
        },
        body: JSON.stringify({
          discord_id: discordUser.id,
          username: discordUser.username,
          email: discordUser.email,
          avatar: discordUser.avatar,
          discriminator: discordUser.discriminator,
        }),
      }
    );

    const backendData = await backendRes.json();

    if (!backendData.success || !backendData.atlas_token) {
      console.error('Backend Discord login failed:', backendData);
      return res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=backend_failed`);
    }

    // Step 4: Redirect to dashboard with session token
    // The token will be stored in localStorage by the frontend redirect handler
    const redirectUrl = new URL(`${process.env.NEXTAUTH_URL}/api/auth/discord/success`);
    redirectUrl.searchParams.set('token', backendData.atlas_token);
    redirectUrl.searchParams.set('user_id', backendData.user_id);
    redirectUrl.searchParams.set('username', discordUser.username);

    res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error('Discord OAuth callback error:', err);
    res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=unknown`);
  }
}