const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getStripe() {
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// POST /billing/create-checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  const { invoice_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

  try {
    const result = await pool.query(
      'SELECT * FROM invoices WHERE id=$1 AND user_id=$2',
      [invoice_id, req.userId]
    );
    const invoice = result.rows[0];
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: 'Freelance services',
            },
            unit_amount: Math.round(Number(invoice.total) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/invoices/${invoice.id}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/invoices/${invoice.id}?payment=cancelled`,
      metadata: { invoice_id: invoice.id, user_id: req.userId },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /billing/webhook  — raw body required (registered in index.js)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { invoice_id, user_id } = session.metadata || {};

    if (invoice_id && user_id) {
      try {
        await pool.query(
          "UPDATE invoices SET status='paid' WHERE id=$1 AND user_id=$2",
          [invoice_id, user_id]
        );

        const amount = session.amount_total / 100;
        await pool.query(
          'INSERT INTO payments (id, invoice_id, amount, stripe_session_id, paid_at) VALUES ($1,$2,$3,$4,$5)',
          [uuidv4(), invoice_id, amount, session.id, new Date().toISOString()]
        );
        console.log(`Invoice ${invoice_id} marked as paid`);
      } catch (err) {
        console.error('Failed to update invoice from webhook:', err);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
