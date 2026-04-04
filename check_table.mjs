import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [result] = await connection.query("SHOW TABLES LIKE 'sila_api_keys'");
  if (result.length > 0) {
    console.log('✅ sila_api_keys table already exists');
  } else {
    console.log('❌ sila_api_keys table does not exist');
    const [createResult] = await connection.query(`
      CREATE TABLE sila_api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        key_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_used_at TIMESTAMP NULL,
        usage_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sila_key_hash (key_hash),
        INDEX idx_sila_is_active (is_active)
      )
    `);
    console.log('✅ sila_api_keys table created successfully');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await connection.end();
}
