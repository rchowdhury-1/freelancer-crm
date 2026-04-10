const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateInvoicePDF } = require('../pdf');
const { sendInvoiceEmail } = require('../email');

const router = express.Router();
router.use(requireAuth);

async function getFullInvoice(invoiceId, userId) {
  const inv = await pool.query(
    `SELECT i.*, c.name AS client_name, c.email AS client_email, c.phone AS client_phone,
            c.company AS client_company, p.title AS project_title
     FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id
     LEFT JOIN projects p ON i.project_id = p.id
     WHERE i.id = $1 AND i.user_id = $2`,
    [invoiceId, userId]
  );
  if (inv.rows.length === 0) return null;

  const items = await pool.query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
    [invoiceId]
  );

  return { ...inv.rows[0], items: items.rows };
}

async function generateInvoiceNumber(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  const result = await pool.query(
    "SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND invoice_number LIKE $2",
    [userId, `${prefix}%`]
  );
  const seq = String(Number(result.rows[0].count) + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

// GET /invoices
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, c.name AS client_name, p.title AS project_title
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [req.userId]
    );
    res.json({ invoices: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const invoice = await getFullInvoice(req.params.id, req.userId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /invoices
router.post('/', async (req, res) => {
  const { client_id, project_id, due_date, items, status } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceNumber = await generateInvoiceNumber(req.userId);
    const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    const id = uuidv4();
    const now = new Date().toISOString();

    await client.query(
      `INSERT INTO invoices (id, user_id, client_id, project_id, invoice_number, status, due_date, total, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, req.userId, client_id || null, project_id || null, invoiceNumber, status || 'draft', due_date || null, total, now]
    );

    for (const item of items) {
      await client.query(
        'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)',
        [uuidv4(), id, item.description, item.quantity, item.unit_price]
      );
    }

    await client.query('COMMIT');

    const invoice = await getFullInvoice(id, req.userId);
    res.status(201).json({ invoice });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /invoices/:id
router.put('/:id', async (req, res) => {
  const { client_id, project_id, due_date, status, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify ownership
    const existing = await client.query(
      'SELECT id FROM invoices WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    let total = null;
    if (items && items.length > 0) {
      total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    }

    if (total !== null) {
      await client.query(
        `UPDATE invoices SET client_id=$1, project_id=$2, due_date=$3, status=$4, total=$5
         WHERE id=$6 AND user_id=$7`,
        [client_id || null, project_id || null, due_date || null, status || 'draft', total, req.params.id, req.userId]
      );

      await client.query('DELETE FROM invoice_items WHERE invoice_id=$1', [req.params.id]);

      for (const item of items) {
        await client.query(
          'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)',
          [uuidv4(), req.params.id, item.description, item.quantity, item.unit_price]
        );
      }
    } else {
      await client.query(
        'UPDATE invoices SET client_id=$1, project_id=$2, due_date=$3, status=$4 WHERE id=$5 AND user_id=$6',
        [client_id || null, project_id || null, due_date || null, status || 'draft', req.params.id, req.userId]
      );
    }

    await client.query('COMMIT');
    const invoice = await getFullInvoice(req.params.id, req.userId);
    res.json({ invoice });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM invoices WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /invoices/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await getFullInvoice(req.params.id, req.userId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const userResult = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.userId]);
    const user = userResult.rows[0];

    const client = {
      name: invoice.client_name,
      email: invoice.client_email,
      phone: invoice.client_phone,
      company: invoice.client_company,
    };

    const pdfBuffer = await generateInvoicePDF({ invoice, client, items: invoice.items, user });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /invoices/:id/send
router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await getFullInvoice(req.params.id, req.userId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!invoice.client_email) return res.status(400).json({ error: 'Client has no email address' });

    const userResult = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.userId]);
    const user = userResult.rows[0];

    const client = {
      name: invoice.client_name,
      email: invoice.client_email,
      phone: invoice.client_phone,
      company: invoice.client_company,
    };

    const pdfBuffer = await generateInvoicePDF({ invoice, client, items: invoice.items, user });

    await sendInvoiceEmail({
      to: invoice.client_email,
      clientName: invoice.client_name || 'Client',
      invoiceNumber: invoice.invoice_number,
      dueDate: invoice.due_date,
      total: invoice.total,
      invoicePdfBuffer: pdfBuffer,
    });

    // Mark as sent if still draft
    if (invoice.status === 'draft') {
      await pool.query('UPDATE invoices SET status=$1 WHERE id=$2', ['sent', req.params.id]);
    }

    res.json({ message: 'Invoice sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

module.exports = router;
