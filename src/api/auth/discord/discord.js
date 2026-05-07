// src/api/auth/discord.js

const DISCORD_CLIENT_ID = process.env.VITE_DISCORD_CLIENT_ID;

export const redirectToDiscordLogin = () => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: `${window.location.origin}/api/auth/discord/callback`,
    response_type: 'code',
    scope: 'identify email',
  });

  window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
};