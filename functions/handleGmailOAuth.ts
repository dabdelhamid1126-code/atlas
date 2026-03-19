import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'authorize') {
      // Gmail is already authorized at this point
      return Response.json({
        success: true,
        message: 'Gmail authorization completed'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Gmail OAuth handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});