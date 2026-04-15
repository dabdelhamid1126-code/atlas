import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const EXTRACTION_PROMPT = `You are extracting order data from a retail invoice or order confirmation.

Extract the following and return ONLY valid JSON, no markdown, no explanation:

{
  "retailer": "store name (e.g. Best Buy, Amazon, Target)",
  "order_number": "order number string",
  "order_date": "YYYY-MM-DD format",
  "tracking_numbers": [],
  "tax": 0.00,
  "shipping_cost": 0.00,
  "fees": 0.00,
  "order_total": 0.00,
  "payment_method_last_four": "last 4 digits of credit/debit card if present, null otherwise",
  "gift_cards": [
    { "last_four": "4 digits", "amount": 0.00 }
  ],
  "items": [
    {
      "product_name": "full specific product name including brand, model, storage, color",
      "sku": "SKU, UPC, or barcode number if present, else null",
      "model": "model number if present",
      "quantity": 1,
      "unit_cost": 0.00,
      "total_cost": 0.00
    }
  ],
  "pickup_location": "store location if pickup order, null if shipped",
  "order_type_hint": "churning or marketplace"
}

RULES:
- product_name MUST be the actual product being purchased, NOT the store/retailer name
- Include brand + model + specs in product_name
- Merge items with identical SKU into one entry with combined quantity
- Skip all free items ($0.00)
- For gift cards extract last 4 digits from masked number (e.g. ****2067 -> "2067")
- order_type_hint: use "churning" if electronics/appliances/toys, "marketplace" otherwise
- If order_date not found use today's date in YYYY-MM-DD format
- All money values as numbers not strings
- tracking_numbers: empty array [] if none found`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, file_type, email_body, email_subject, email_from } = body;

    // ── Mode 1: Email body (from Gmail sync) ──────────────────────────────
    if (email_body) {
      const emailPrompt = `${EXTRACTION_PROMPT}

You are reading a raw order confirmation email. Here is the email content:

FROM: ${email_from || ''}
SUBJECT: ${email_subject || ''}

EMAIL BODY:
${email_body.substring(0, 8000)}`; // limit to 8k chars to stay within context

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: emailPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            retailer: { type: 'string' },
            order_number: { type: 'string' },
            order_date: { type: 'string' },
            tracking_numbers: { type: 'array', items: { type: 'string' } },
            tax: { type: 'number' },
            shipping_cost: { type: 'number' },
            fees: { type: 'number' },
            order_total: { type: 'number' },
            payment_method_last_four: { type: 'string' },
            pickup_location: { type: 'string' },
            order_type_hint: { type: 'string' },
            gift_cards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  last_four: { type: 'string' },
                  amount: { type: 'number' },
                },
              },
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_name: { type: 'string' },
                  sku: { type: 'string' },
                  model: { type: 'string' },
                  quantity: { type: 'number' },
                  unit_cost: { type: 'number' },
                  total_cost: { type: 'number' },
                },
              },
            },
          },
        },
      });

      return Response.json({ extracted: result });
    }

    // ── Mode 2: File URL (existing upload flow) ───────────────────────────
    if (!file_url) {
      return Response.json({ error: 'file_url or email_body is required' }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: EXTRACTION_PROMPT,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          retailer: { type: 'string' },
          order_number: { type: 'string' },
          order_date: { type: 'string' },
          tracking_numbers: { type: 'array', items: { type: 'string' } },
          tax: { type: 'number' },
          shipping_cost: { type: 'number' },
          fees: { type: 'number' },
          order_total: { type: 'number' },
          payment_method_last_four: { type: 'string' },
          pickup_location: { type: 'string' },
          order_type_hint: { type: 'string' },
          gift_cards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                last_four: { type: 'string' },
                amount: { type: 'number' },
              },
            },
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                sku: { type: 'string' },
                model: { type: 'string' },
                quantity: { type: 'number' },
                unit_cost: { type: 'number' },
                total_cost: { type: 'number' },
              },
            },
          },
        },
      },
    });

    return Response.json({ extracted: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});