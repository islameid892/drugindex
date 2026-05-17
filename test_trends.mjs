import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = createPool({ uri: process.env.DATABASE_URL });

const [rows] = await pool.query(`
  SELECT DATE(createdAt) as date, COUNT(*) as count
  FROM search_analytics
  WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  GROUP BY DATE(createdAt)
  ORDER BY DATE(createdAt)
`);
console.log('Weekly trends:', JSON.stringify(rows, null, 2));

const [allDates] = await pool.query(`
  SELECT DATE(createdAt) as date, COUNT(*) as count
  FROM search_analytics
  GROUP BY DATE(createdAt)
  ORDER BY DATE(createdAt) DESC
  LIMIT 10
`);
console.log('All dates:', JSON.stringify(allDates, null, 2));

await pool.end();
