import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations(): Promise<void> {
  try {
    console.log('Running database migrations...');

    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read and execute initial schema migration
    const migrationPath = join(__dirname, '../../migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Check if migration already executed
    const result = await pool.query('SELECT * FROM migrations WHERE name = $1', [
      '001_initial_schema',
    ]);

    if (result.rows.length === 0) {
      // Execute migration
      await pool.query(migrationSQL);

      // Record migration
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', ['001_initial_schema']);

      console.log('✅ Migration 001_initial_schema executed successfully');
    } else {
      console.log('ℹ️  Migration 001_initial_schema already executed');
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
