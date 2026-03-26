import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const EXTRACTION_PROMPT = `You are extracting order data from a retail invoice or order confirmation image or PDF.

Extract the following and return ONLY valid JSON, no markdown, no explanation:

{
  "retailer": "store name (e.g. Best Buy, Amazon, Target)",
  "order_number": "order number string",
  "order_date": "YYYY-MM-DD format",
  "tracking_numbers": ["array of tracking numbers, empty if none"],
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
- Skip all free items ($0.00) like free trials, digital freebies, gift-with-purchase
- Skip items where product_name contains "Free" and total_cost is 0
- For gift cards extract last 4 digits from the masked number (e.g. ****2067 -> "2067")
- order_type_hint: use "churning" if this looks like a resale purchase (electronics, appliances, toys), "marketplace" otherwise
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

    const { file_url, file_type } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    }

    // Build the message with the file URL as image
    const isImage = file_type && file_type.startsWith('image/');

    let messageContent;
    if (isImage) {
      messageContent = [
        {
          type: 'image_url',
          image_url: { url: file_url },
        },
        {
          type: 'text',
          text: EXTRACTION_PROMPT,
        },
      ];
    } else {
      // For PDFs, fetch the content and send as base64 image (convert first page concept)
      // We'll use the URL directly as an image_url for supported formats
      messageContent = [
        {
          type: 'image_url',
          image_url: { url: file_url },
        },
        {
          type: 'text',
          text: EXTRACTION_PROMPT,
        },
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.error?.message || 'OpenAI API error' }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const extracted = JSON.parse(clean);

    return Response.json({ extracted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});