const { Pool } = require('pg');

// Database connection (use the same as in server.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/zaubacorp_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    // Create companies table if it doesn't exist
    await pool.query(`
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
    `);

    // Create indexes for performance (especially for 10M records)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_name ON companies (name);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cin ON companies (cin);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_status ON companies (status);`);

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    pool.end();
  }
})();