const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { sendVerificationEmail } = require('../email');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function signAccess(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefresh(userId) {
  return jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const now = new Date().toISOString();
    const verificationToken = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, created_at, email_verified, verification_token) VALUES ($1,$2,$3,$4,$5,false,$6)',
      [id, name, email, hash, now, verificationToken]
    );

    const verificationUrl = `${process.env.BACKEND_URL}/auth/verify-email?token=${verificationToken}`;
    await sendVerificationEmail({ to: email, name, verificationUrl });

    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email before logging in.' });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);
    const refreshId = uuidv4();
    const now = new Date().toISOString();
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO refresh_tokens (id, token, user_id, expires_at, created_at) VALUES ($1,$2,$3,$4,$5)',
      [refreshId, refreshToken, user.id, refreshExpiry, now]
    );

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect(`${process.env.CLIENT_URL}/login?verified=invalid`);

  try {
    const result = await pool.query('SELECT id FROM users WHERE verification_token=$1', [token]);
    if (result.rows.length === 0) return res.redirect(`${process.env.CLIENT_URL}/login?verified=invalid`);

    await pool.query('UPDATE users SET email_verified=true, verification_token=NULL WHERE id=$1', [result.rows[0].id]);
    res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.CLIENT_URL}/login?verified=invalid`);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, process.env.REFRESH_SECRET);
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2',
      [token, payload.userId]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid refresh token' });

    const stored = result.rows[0];
    if (new Date(stored.expires_at) < new Date()) {
      await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const newAccess = signAccess(payload.userId);
    res.json({ accessToken: newAccess });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]).catch(() => {});
  }
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
});

// GET /auth/me
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [payload.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PUT /auth/profile
router.put('/profile', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);

    // Check email uniqueness
    const existing = await pool.query('SELECT id FROM users WHERE email=$1 AND id!=$2', [email, payload.userId]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });

    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING id, name, email, created_at',
      [name, email, payload.userId]
    );
    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PUT /auth/password
router.put('/password', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id=$1', [payload.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, payload.userId]);
    res.json({ message: 'Password updated' });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
