const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

// GET /projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS client_name, c.company AS client_company
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.userId]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /projects/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1 AND p.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /projects
router.post('/', async (req, res) => {
  const { client_id, title, description, status, rate, rate_type, deadline } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO projects (id, user_id, client_id, title, description, status, rate, rate_type, deadline, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, req.userId, client_id || null, title, description || null, status || 'not_started', rate || null, rate_type || null, deadline || null, now]
    );
    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /projects/:id
router.put('/:id', async (req, res) => {
  const { client_id, title, description, status, rate, rate_type, deadline } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const result = await pool.query(
      `UPDATE projects SET client_id=$1, title=$2, description=$3, status=$4, rate=$5, rate_type=$6, deadline=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [client_id || null, title, description || null, status || 'not_started', rate || null, rate_type || null, deadline || null, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
