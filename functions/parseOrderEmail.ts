/**
 * Parse order confirmation emails from Best Buy and Amazon
 * and automatically create purchase orders
 */

export default async function parseOrderEmail({ emailSubject, emailBody, emailHtml }, { base44 }) {
  try {
    const orderData = {
      retailer: null,
      order_number: null,
      total_cost: 0,
      order_date: new Date().toISOString().split('T')[0],
      status: 'ordered',
      items: []
    };

    // Detect retailer
    if (emailSubject.toLowerCase().includes('amazon') || emailBody.toLowerCase().includes('amazon.com')) {
      orderData.retailer = 'Amazon';
      parseAmazonEmail(emailBody, emailHtml, orderData);
    } else if (emailSubject.toLowerCase().includes('best buy') || emailBody.toLowerCase().includes('bestbuy.com')) {
      orderData.retailer = 'Best Buy';
      parseBestBuyEmail(emailBody, emailHtml, orderData);
    } else {
      return { success: false, message: 'Email is not from Amazon or Best Buy' };
    }

    // Validate we got essential data
    if (!orderData.order_number) {
      return { success: false, message: 'Could not extract order number' };
    }

    // Check if order already exists
    const existing = await base44.entities.PurchaseOrder.filter({ order_number: orderData.order_number });
    if (existing.length > 0) {
      return { success: false, message: 'Order already exists', order_number: orderData.order_number };
    }

    // Create the purchase order
    const created = await base44.entities.PurchaseOrder.create(orderData);

    return { 
      success: true, 
      message: 'Purchase order created successfully',
      order: created
    };

  } catch (error) {
    return { success: false, message: error.message };
  }
}

function parseAmazonEmail(emailBody, emailHtml, orderData) {
  const text = emailHtml || emailBody;
  
  // Extract order number
  const orderNumMatch = text.match(/Order #?(\d{3}-\d{7}-\d{7})/i) || 
                        text.match(/order number[:\s]+(\d{3}-\d{7}-\d{7})/i);
  if (orderNumMatch) {
    orderData.order_number = orderNumMatch[1];
  }

  // Extract total
  const totalMatch = text.match(/Order Total[:\s]+\$?([\d,]+\.?\d*)/i) ||
                     text.match(/Grand Total[:\s]+\$?([\d,]+\.?\d*)/i);
  if (totalMatch) {
    orderData.total_cost = parseFloat(totalMatch[1].replace(/,/g, ''));
    orderData.final_cost = orderData.total_cost;
  }

  // Extract tracking number
  const trackingMatch = text.match(/Tracking.*?(\d{12,})/i) ||
                        text.match(/tracking number[:\s]+(\w+)/i);
  if (trackingMatch) {
    orderData.tracking_number = trackingMatch[1];
  }

  // Extract order date
  const dateMatch = text.match(/Ordered on ([A-Za-z]+ \d+, \d{4})/i) ||
                    text.match(/Order Date[:\s]+([A-Za-z]+ \d+, \d{4})/i);
  if (dateMatch) {
    const date = new Date(dateMatch[1]);
    if (!isNaN(date.getTime())) {
      orderData.order_date = date.toISOString().split('T')[0];
    }
  }

  // Extract items (basic pattern)
  const itemPattern = /([A-Za-z0-9\s\-\.,]+)\s+\$?([\d,]+\.?\d*)/g;
  let match;
  const potentialItems = [];
  
  while ((match = itemPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const price = parseFloat(match[2].replace(/,/g, ''));
    if (price > 0 && name.length > 5 && name.length < 150) {
      potentialItems.push({ name, price });
    }
  }

  // Add items to order
  if (potentialItems.length > 0) {
    orderData.items = potentialItems.slice(0, 10).map(item => ({
      product_name: item.name,
      quantity_ordered: 1,
      quantity_received: 0,
      unit_cost: item.price
    }));
  }

  orderData.notes = 'Auto-imported from Amazon email';
}

function parseBestBuyEmail(emailBody, emailHtml, orderData) {
  const text = emailHtml || emailBody;
  
  // Extract order number
  const orderNumMatch = text.match(/Order Number[:\s]+([A-Z0-9]+)/i) ||
                        text.match(/BBY\d+-\d+/i);
  if (orderNumMatch) {
    orderData.order_number = orderNumMatch[1];
  }

  // Extract total
  const totalMatch = text.match(/Order Total[:\s]+\$?([\d,]+\.?\d*)/i) ||
                     text.match(/Total[:\s]+\$?([\d,]+\.?\d*)/i);
  if (totalMatch) {
    orderData.total_cost = parseFloat(totalMatch[1].replace(/,/g, ''));
    orderData.final_cost = orderData.total_cost;
  }

  // Extract tracking number
  const trackingMatch = text.match(/Tracking.*?(\d{12,})/i);
  if (trackingMatch) {
    orderData.tracking_number = trackingMatch[1];
  }

  // Extract order date
  const dateMatch = text.match(/Order Date[:\s]+([A-Za-z]+ \d+, \d{4})/i) ||
                    text.match(/Placed on ([A-Za-z]+ \d+, \d{4})/i);
  if (dateMatch) {
    const date = new Date(dateMatch[1]);
    if (!isNaN(date.getTime())) {
      orderData.order_date = date.toISOString().split('T')[0];
    }
  }

  // Extract items
  const itemPattern = /([A-Za-z0-9\s\-\.,]+)\s+\$?([\d,]+\.?\d*)/g;
  let match;
  const potentialItems = [];
  
  while ((match = itemPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const price = parseFloat(match[2].replace(/,/g, ''));
    if (price > 0 && name.length > 5 && name.length < 150) {
      potentialItems.push({ name, price });
    }
  }

  if (potentialItems.length > 0) {
    orderData.items = potentialItems.slice(0, 10).map(item => ({
      product_name: item.name,
      quantity_ordered: 1,
      quantity_received: 0,
      unit_cost: item.price
    }));
  }

  orderData.notes = 'Auto-imported from Best Buy email';
}