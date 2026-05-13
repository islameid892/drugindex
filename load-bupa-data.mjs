import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function loadBupaData() {
  try {
    const connection = await pool.getConnection();
    
    // Read JSON data
    const jsonData = fs.readFileSync('/home/ubuntu/upload/bupa_data.json', 'utf-8');
    const data = JSON.parse(jsonData);
    
    console.log(`Loading ${data.length} Bupa prerequisites...`);
    
    // Insert in batches
    const batchSize = 10;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const values = batch.map(record => [
        record.serviceName,
        record.icdCodes,
        record.requirements
      ]);
      
      await connection.query(
        'INSERT INTO bupa_prerequisites (service_name, icd_codes, requirements) VALUES ?',
        [values]
      );
      
      console.log(`Loaded ${Math.min(i + batchSize, data.length)}/${data.length} records`);
    }
    
    console.log('✅ All data loaded successfully!');
    connection.release();
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

loadBupaData();
