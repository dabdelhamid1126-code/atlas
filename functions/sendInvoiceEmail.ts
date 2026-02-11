/**
 * Send invoice confirmation email via Resend
 */

export default async function sendInvoiceEmail({ invoiceId }, { base44 }) {
  try {
    // Get the invoice
    const invoices = await base44.entities.Invoice.filter({ id: invoiceId });
    if (invoices.length === 0) {
      return { success: false, message: 'Invoice not found' };
    }
    
    const invoice = invoices[0];

    if (!invoice.buyer_email) {
      return { success: false, message: 'No buyer email address' };
    }

    // Build items table
    const itemsHtml = (invoice.items || []).map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">Invoice</h1>
            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px;">#${invoice.invoice_number}</p>
          </div>

          <!-- Content -->
          <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <p style="margin: 0 0 24px 0; color: #334155; font-size: 16px;">Hello ${invoice.buyer},</p>
            
            <p style="margin: 0 0 32px 0; color: #64748b; font-size: 14px;">
              Thank you for your business! Please find your invoice details below.
            </p>

            <!-- Invoice Details -->
            <div style="margin-bottom: 32px; padding: 20px; background-color: #f8fafc; border-radius: 12px;">
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Invoice Date:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">
                  ${invoice.invoice_date || 'N/A'}
                </span>
              </div>
              <div>
                <span style="color: #64748b; font-size: 14px;">Due Date:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">
                  ${invoice.due_date || 'N/A'}
                </span>
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 12px; text-align: left; color: #475569; font-size: 14px; font-weight: 600;">Description</th>
                  <th style="padding: 12px; text-align: center; color: #475569; font-size: 14px; font-weight: 600;">Qty</th>
                  <th style="padding: 12px; text-align: right; color: #475569; font-size: 14px; font-weight: 600;">Price</th>
                  <th style="padding: 12px; text-align: right; color: #475569; font-size: 14px; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Totals -->
            <div style="text-align: right; padding: 20px; background-color: #f8fafc; border-radius: 12px;">
              <div style="margin-bottom: 8px;">
                <span style="color: #64748b; font-size: 14px;">Subtotal:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 16px;">$${(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style="margin-bottom: 16px;">
                <span style="color: #64748b; font-size: 14px;">Tax:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 16px;">$${(invoice.tax || 0).toFixed(2)}</span>
              </div>
              <div style="padding-top: 16px; border-top: 2px solid #cbd5e1;">
                <span style="color: #1e293b; font-size: 20px; font-weight: bold;">Total:</span>
                <span style="color: #667eea; font-size: 24px; font-weight: bold; margin-left: 16px;">$${(invoice.total || 0).toFixed(2)}</span>
              </div>
            </div>

            ${invoice.notes ? `
              <div style="margin-top: 32px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase;">Note</p>
                <p style="margin: 0; color: #78350f; font-size: 14px;">${invoice.notes}</p>
              </div>
            ` : ''}

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Thank you for your business!
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 24px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const resendApiKey = base44.secrets.RESEND_API_KEY;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FalconFlips <orders@resend.dev>',
        to: [invoice.buyer_email],
        subject: `Invoice #${invoice.invoice_number} - $${(invoice.total || 0).toFixed(2)}`,
        html: htmlBody
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Failed to send email' 
      };
    }

    return { 
      success: true, 
      message: 'Invoice email sent successfully',
      emailId: result.id 
    };

  } catch (error) {
    return { 
      success: false, 
      message: error.message 
    };
  }
}