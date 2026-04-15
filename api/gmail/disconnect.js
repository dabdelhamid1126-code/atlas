// api/gmail/disconnect.js
// Removes stored Gmail tokens for a user

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_email } = req.body;

  if (!user_email) {
    return res.status(400).json({ error: 'user_email is required' });
  }

  try {
    const deleteRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/gmail_tokens?user_email=eq.${encodeURIComponent(user_email)}`,
      {
        method:  'DELETE',
        headers: {
          'apikey':        process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!deleteRes.ok) {
      return res.status(500).json({ error: 'Failed to disconnect' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
