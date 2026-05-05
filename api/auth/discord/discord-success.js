// api/auth/discord/success.js
// Handles the successful Discord login by storing the token and redirecting

export default function handler(req, res) {
  const { token, user_id, username } = req.query;

  if (!token) {
    return res.redirect(`${process.env.NEXTAUTH_URL}/login?discord_error=no_token`);
  }

  // Create an HTML page that stores the token in localStorage and redirects
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logging in...</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0d0b08; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="text-align: center;">
        <div style="width: 48px; height: 48px; border: 3px solid #C4922E; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px;" id="spinner"></div>
        <p style="color: #f5e09a; margin: 0;">Logging you in...</p>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <script>
        // Store token in localStorage
        localStorage.setItem('base44_access_token', '${token}');
        if ('${user_id}') localStorage.setItem('atlas_user_id', '${user_id}');
        if ('${username}') localStorage.setItem('discord_username', '${username}');
        
        // Redirect to dashboard
        window.location.href = '${process.env.NEXTAUTH_URL}/Dashboard';
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
