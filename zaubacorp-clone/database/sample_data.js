const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/zaubacorp_db' });

const sampleCompanies = [
  { name: 'ABC Pvt Ltd', cin: 'U12345MH2020PTC123456', registration_date: '2020-01-01', status: 'Active', address: 'Mumbai, India', directors: ['John Doe', 'Jane Smith'] },
  // Add more... For 10M, use a loop or bulk insert from CSV
];

(async () => {
  for (const company of sampleCompanies) {
    await pool.query(
      'INSERT INTO companies (name, cin, registration_date, status, address, directors) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (cin) DO NOTHING',
      [company.name, company.cin, company.registration_date, company.status, company.address, JSON.stringify(company.directors)]
    );
  }
  console.log('Sample data inserted');
  pool.end();
})();