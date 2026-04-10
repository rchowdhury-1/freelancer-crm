const PDFDocument = require('pdfkit');

function generateInvoicePDF({ invoice, client, items, user }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const accentColor = '#4f46e5';
    const lightGray = '#f3f4f6';
    const textDark = '#111827';
    const textMuted = '#6b7280';

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill(accentColor);

    doc
      .fillColor('white')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 25);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`#${invoice.invoice_number}`, 50, 58);

    // From info (top right)
    const fromName = user?.name || 'Freelancer';
    doc
      .fillColor('white')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(fromName, 0, 25, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor(textDark);

    // Divider spacing
    doc.moveDown(3);

    const sectionTop = 110;

    // Invoice details (right column)
    const detailsX = 350;
    let detailsY = sectionTop;

    function detailRow(label, value) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(textMuted)
        .text(label.toUpperCase(), detailsX, detailsY, { width: 80 });
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(textDark)
        .text(value || '—', detailsX + 85, detailsY, { width: 150 });
      detailsY += 18;
    }

    const issueDate = invoice.created_at
      ? new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Upon receipt';

    detailRow('Issue Date', issueDate);
    detailRow('Due Date', dueDate);
    detailRow('Status', invoice.status?.toUpperCase() || 'DRAFT');

    // Bill To (left column)
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(textMuted)
      .text('BILL TO', 50, sectionTop);

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor(textDark)
      .text(client?.name || 'Client', 50, sectionTop + 16);

    let billY = sectionTop + 34;
    if (client?.company) {
      doc.fontSize(10).font('Helvetica').fillColor(textMuted).text(client.company, 50, billY);
      billY += 15;
    }
    if (client?.email) {
      doc.fontSize(10).font('Helvetica').fillColor(textMuted).text(client.email, 50, billY);
      billY += 15;
    }
    if (client?.phone) {
      doc.fontSize(10).font('Helvetica').fillColor(textMuted).text(client.phone, 50, billY);
    }

    // Items table
    const tableTop = Math.max(detailsY, billY) + 40;
    const colDesc = 50;
    const colQty = 310;
    const colUnit = 380;
    const colTotal = 460;
    const tableWidth = doc.page.width - 100;

    // Table header
    doc.rect(50, tableTop, tableWidth, 26).fill(accentColor);

    doc
      .fillColor('white')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('DESCRIPTION', colDesc + 4, tableTop + 8)
      .text('QTY', colQty, tableTop + 8)
      .text('UNIT PRICE', colUnit, tableTop + 8)
      .text('TOTAL', colTotal, tableTop + 8);

    let rowY = tableTop + 26;
    let subtotal = 0;

    (items || []).forEach((item, i) => {
      const lineTotal = Number(item.quantity) * Number(item.unit_price);
      subtotal += lineTotal;

      if (i % 2 === 1) {
        doc.rect(50, rowY, tableWidth, 24).fill(lightGray);
      }

      doc
        .fillColor(textDark)
        .fontSize(10)
        .font('Helvetica')
        .text(item.description || '', colDesc + 4, rowY + 7, { width: colQty - colDesc - 10 })
        .text(String(item.quantity), colQty, rowY + 7)
        .text(`$${Number(item.unit_price).toFixed(2)}`, colUnit, rowY + 7)
        .text(`$${lineTotal.toFixed(2)}`, colTotal, rowY + 7);

      rowY += 24;
    });

    // Bottom border of table
    doc.moveTo(50, rowY).lineTo(50 + tableWidth, rowY).strokeColor('#e5e7eb').stroke();

    // Totals
    const totalsX = 380;
    let totalsY = rowY + 16;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(textMuted)
      .text('Subtotal', totalsX, totalsY)
      .fillColor(textDark)
      .text(`$${subtotal.toFixed(2)}`, colTotal, totalsY);

    totalsY += 16;

    // Total box
    doc.rect(totalsX - 10, totalsY + 6, tableWidth - (totalsX - 60), 30).fill(accentColor);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('white')
      .text('TOTAL DUE', totalsX, totalsY + 13)
      .text(`$${Number(invoice.total).toFixed(2)}`, colTotal, totalsY + 13);

    // Footer
    const footerY = doc.page.height - 60;
    doc
      .rect(0, footerY, doc.page.width, 60)
      .fill(lightGray);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(textMuted)
      .text('Thank you for your business.', 50, footerY + 22, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
