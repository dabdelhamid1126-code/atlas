import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const EXTRACTION_PROMPT = `You are extracting order data from a retail invoice or order confirmation image or PDF.

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
      "product_name": "full product name",
      "sku": "SKU or UPC number if present, else null",
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
- Merge items with identical SKU into one entry with combined quantity
- Skip all free items ($0.00) — free trials, digital freebies, gift-with-purchase
- Skip items where product_name contains "Free" and total_cost is 0
- For gift cards extract last 4 digits from masked number (e.g. ****2067 -> "2067")
- order_type_hint: use "churning" if this looks like a resale purchase (electronics, appliances, toys), "marketplace" otherwise
- If order_date not found use today's date in YYYY-MM-DD format
- All money values as numbers not strings
- tracking_numbers: empty array [] if none found
- pickup_location: include store name/city if it is a store pickup order`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_type } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Use the built-in InvokeLLM integration with file_urls for vision
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