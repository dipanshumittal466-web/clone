const express = require('express');
const { Pool } = require('pg');  // Use PostgreSQL for scalability
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection (use Render's PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/zaubacorp_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database
pool.query(`
  CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cin TEXT UNIQUE,
    registration_date DATE,
    status TEXT,
    address TEXT,
    directors JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_name ON companies (name);
  CREATE INDEX IF NOT EXISTS idx_cin ON companies (cin);
`).catch(err => console.error('DB init error:', err));

// API Routes
// Search companies (with pagination)
app.get('/api/companies', async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM companies';
  let params = [];
  if (q) {
    query += ' WHERE name ILIKE $1 OR cin ILIKE $1';
    params = [`%${q}%`];
  }
  query += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  try {
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM companies' + (q ? ' WHERE name ILIKE $1 OR cin ILIKE $1' : ''), q ? [`%${q}%`] : []);
    res.json({
      companies: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a company
app.post('/api/companies', async (req, res) => {
  const { name, cin, registration_date, status, address, directors } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO companies (name, cin, registration_date, status, address, directors) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, cin, registration_date, status, address, JSON.stringify(directors)]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a company
app.put('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  const { name, cin, registration_date, status, address, directors } = req.body;
  try {
    const result = await pool.query(
      'UPDATE companies SET name=$1, cin=$2, registration_date=$3, status=$4, address=$5, directors=$6 WHERE id=$7',
      [name, cin, registration_date, status, address, JSON.stringify(directors), id]
    );
    res.json({ changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a company
app.delete('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM companies WHERE id=$1', [id]);
    res.json({ changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/results', (req, res) => res.sendFile(path.join(__dirname, 'public', 'results.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));