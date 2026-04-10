const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId;

    const [
      clientsResult,
      projectsResult,
      invoicesResult,
      revenueResult,
      recentClientsResult,
      recentProjectsResult,
      recentInvoicesResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM clients WHERE user_id=$1', [userId]),
      pool.query("SELECT COUNT(*) FROM projects WHERE user_id=$1 AND status='in_progress'", [userId]),
      pool.query("SELECT COALESCE(SUM(total),0) FROM invoices WHERE user_id=$1 AND status != 'paid'", [userId]),
      pool.query("SELECT COALESCE(SUM(amount),0) FROM payments p JOIN invoices i ON p.invoice_id=i.id WHERE i.user_id=$1", [userId]),
      pool.query('SELECT id, name, company, created_at FROM clients WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [userId]),
      pool.query('SELECT id, title, status, deadline FROM projects WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [userId]),
      pool.query(
        `SELECT i.id, i.invoice_number, i.status, i.total, i.due_date, c.name AS client_name
         FROM invoices i LEFT JOIN clients c ON i.client_id=c.id
         WHERE i.user_id=$1 ORDER BY i.created_at DESC LIMIT 5`,
        [userId]
      ),
    ]);

    // Monthly revenue for last 6 months
    const monthlyResult = await pool.query(
      `SELECT
         TO_CHAR(paid_at::timestamp, 'Mon') AS month,
         TO_CHAR(paid_at::timestamp, 'YYYY-MM') AS month_key,
         SUM(p.amount) AS revenue
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE i.user_id = $1
         AND paid_at::timestamp >= NOW() - INTERVAL '6 months'
       GROUP BY month_key, month
       ORDER BY month_key`,
      [userId]
    );

    // Build 6-month array with zeros for missing months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const found = monthlyResult.rows.find((r) => r.month_key === key);
      months.push({ month: label, revenue: found ? Number(found.revenue) : 0 });
    }

    res.json({
      totalClients: Number(clientsResult.rows[0].count),
      activeProjects: Number(projectsResult.rows[0].count),
      outstandingInvoices: Number(invoicesResult.rows[0].coalesce),
      totalRevenue: Number(revenueResult.rows[0].coalesce),
      monthlyRevenue: months,
      recentClients: recentClientsResult.rows,
      recentProjects: recentProjectsResult.rows,
      recentInvoices: recentInvoicesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
