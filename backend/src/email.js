const { Resend } = require('resend');

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

async function sendInvoiceEmail({ to, clientName, invoiceNumber, dueDate, total, invoicePdfBuffer, invoiceUrl }) {
  const resend = getResend();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
      <h2 style="color: #4f46e5;">Invoice ${invoiceNumber}</h2>
      <p>Hi ${clientName},</p>
      <p>Please find your invoice attached to this email.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; color: #555;">Invoice Number</td>
          <td style="padding: 8px 0; font-weight: bold;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #555;">Amount Due</td>
          <td style="padding: 8px 0; font-weight: bold;">$${Number(total).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #555;">Due Date</td>
          <td style="padding: 8px 0; font-weight: bold;">${dueDate ? new Date(dueDate).toLocaleDateString() : 'Upon receipt'}</td>
        </tr>
      </table>
      ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Pay Online</a></p>` : ''}
      <p style="color: #555; font-size: 14px;">Thank you for your business.</p>
    </div>
  `;

  const attachments = invoicePdfBuffer
    ? [{ filename: `invoice-${invoiceNumber}.pdf`, content: invoicePdfBuffer.toString('base64') }]
    : [];

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice ${invoiceNumber} — $${Number(total).toFixed(2)} due`,
    html,
    attachments,
  });
}

module.exports = { sendInvoiceEmail };
