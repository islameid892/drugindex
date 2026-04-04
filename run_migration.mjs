import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migration completed successfully');
} catch (error) {
  console.error('❌ Migration error:', error.message);
} finally {
  await connection.end();
}
