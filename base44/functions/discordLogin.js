// functions/discordLogin.js
// Base44 function to handle Discord OAuth login
// Called from: POST /api/auth/discord/callback

export default async function discordLogin(req) {
  try {
    const { 
      discord_id, 
      username, 
      email, 
      avatar,
      discriminator 
    } = req.body;

    // Validate input
    if (!discord_id || !username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: discord_id, username'
        })
      };
    }

    // Get database client from Base44 context
    const db = req.db;

    // ─── Step 1: Find or create user by Discord ID ─────────────────
    // Fetch user by discord_id
    let user = null;
    try {
      const users = await db.query(
        `SELECT * FROM users WHERE discord_id = ?`,
        [discord_id]
      );
      user = users && users[0] ? users[0] : null;
    } catch (err) {
      console.error('Error querying users by discord_id:', err);
      // Table might not exist yet — create it or continue
    }

    let isNewUser = false;

    if (!user) {
      // ─── Create new user ────────────────────────────────────────
      isNewUser = true;
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      try {
        await db.query(
          `INSERT INTO users (
            id, 
            discord_id, 
            username, 
            email, 
            avatar_url, 
            created_at, 
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, discord_id, username, email || null, avatar || null, now, now]
        );
        user = { id: userId, discord_id, username, email };
      } catch (insertErr) {
        console.error('Error creating user:', insertErr);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to create user account'
          })
        };
      }
    } else {
      // ─── Update existing user ───────────────────────────────────
      const now = new Date().toISOString();
      try {
        await db.query(
          `UPDATE users 
           SET username = ?, email = ?, avatar_url = ?, updated_at = ?
           WHERE discord_id = ?`,
          [username, email || null, avatar || null, now, discord_id]
        );
      } catch (updateErr) {
        console.error('Error updating user:', updateErr);
        // Continue anyway — we have the user object
      }
    }

    const userId = user.id;

    // ─── Step 2: Generate Atlas session token ────────────────────
    const atlasToken = generateSecureToken(40);
    const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    try {
      await db.query(
        `INSERT INTO auth_tokens (
          user_id, 
          token, 
          type, 
          expires_at, 
          created_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [userId, atlasToken, 'discord', tokenExpiry, new Date().toISOString()]
      );
    } catch (tokenErr) {
      console.error('Error creating auth token:', tokenErr);
      // Token table might not exist — create it or log error
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to generate session token'
        })
      };
    }

    // ─── Step 3: Get or assign app context ──────────────────────
    // Check if user has an app assigned
    let appId = null;
    try {
      const userApps = await db.query(
        `SELECT app_id FROM user_apps WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (userApps && userApps[0]) {
        appId = userApps[0].app_id;
      }
    } catch (err) {
      console.error('Error fetching user apps:', err);
    }

    // If no app assigned, use the current app ID from Base44 context
    if (!appId) {
      appId = req.appId || 'atlasresellhub'; // Fallback to your app name
    }

    // ─── Log successful login ────────────────────────────────────
    console.log(`[Discord Login] User ${userId} (${username}) authenticated`, {
      isNewUser,
      discordId: discord_id,
      email,
      appId
    });

    // ─── Return success with auth token ──────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user_id: userId,
        atlas_token: atlasToken,
        app_id: appId,
        user: {
          id: userId,
          discord_id,
          username,
          email,
          avatar
        },
        message: isNewUser ? 'Account created' : 'User authenticated',
        token_expires_at: tokenExpiry.toISOString()
      })
    };

  } catch (error) {
    console.error('[Discord Login Error]', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
}

// ─── Helper: Generate secure token ──────────────────────────────────
function generateSecureToken(length = 40) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
