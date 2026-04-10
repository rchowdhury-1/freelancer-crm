const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /clients
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ clients: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /clients
router.post('/', async (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.query(
      'INSERT INTO clients (id, user_id, name, email, phone, company, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, req.userId, name, email || null, phone || null, company || null, notes || null, now]
    );
    res.status(201).json({ client: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /clients/:id
router.put('/:id', async (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await pool.query(
      `UPDATE clients SET name=$1, email=$2, phone=$3, company=$4, notes=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [name, email || null, phone || null, company || null, notes || null, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ client: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM clients WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
