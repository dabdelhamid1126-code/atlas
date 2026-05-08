import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // CORS for Chrome extension
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Auth check — must be a registered user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, {
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body = await req.json();

    const {
      order_type      = 'churning',
      retailer,
      order_number    = null,
      order_date,
      status          = 'ordered',
      total_cost      = 0,
      final_cost,
      tax             = null,
      gift_card_value = null,
      tracking_number = null,
      card_name       = null,
      credit_card_id  = null,
      is_pickup       = false,
      account         = null,
      notes           = null,
      items           = [],
    } = body;

    if (!retailer) {
      return Response.json({ error: 'retailer is required' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const order = await base44.entities.PurchaseOrder.create({
      order_type,
      retailer,
      order_number,
      order_date:      order_date || new Date().toISOString().split('T')[0],
      status,
      total_cost:      parseFloat(total_cost)  || 0,
      final_cost:      final_cost != null ? parseFloat(final_cost) : parseFloat(total_cost) || 0,
      tax:             tax             ? parseFloat(tax)             : null,
      gift_card_value: gift_card_value ? parseFloat(gift_card_value) : null,
      tracking_number: tracking_number || null,
      card_name:       card_name       || null,
      credit_card_id:  credit_card_id  || null,
      is_pickup,
      account:         account || null,
      notes:           notes   || 'Imported via Atlas extension',
      items: items.map(item => ({
        name:       item.name  || item.title || '',
        qty:        item.qty   || item.quantity || 1,
        unit_price: item.unit_price || item.price || 0,
        asin:       item.asin  || null,
        sku:        item.sku   || null,
        model:      item.model || null,
      })),
    });

    return Response.json({ success: true, order_id: order.id, order }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return Response.json({ error: error.message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
});