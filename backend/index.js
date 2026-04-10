require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDb } = require('./src/db');

const app = express();

// Stripe webhook must use raw body — register before express.json()
app.use('/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', require('./src/routes/auth'));
app.use('/clients', require('./src/routes/clients'));
app.use('/projects', require('./src/routes/projects'));
app.use('/invoices', require('./src/routes/invoices'));
app.use('/billing', require('./src/routes/billing'));
app.use('/dashboard', require('./src/routes/dashboard'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
