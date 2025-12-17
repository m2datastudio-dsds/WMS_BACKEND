// src/middleware/cwph.js
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

// Base config for ALL CWPH DB connections (Postgres on RDS)
const baseConfig = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_SERVER,          // e.g. your RDS endpoint
  port:     Number(process.env.DB_PORT || 5432),
  ssl: { rejectUnauthorized: false },       // typical for RDS Postgres
};

const pools = new Map();

/**
 * Get (or create) a pooled connection to the CWPH DB (Postgres).
 * Controllers still call: const pool = await getPool(CWPH_DB);
 * and then use: pool.query(sql, params)
 */
export async function getPool(dbName) {
  const key = `cwph:${dbName}`;
  if (!pools.has(key)) {
    const pool = new Pool({ ...baseConfig, database: dbName });
    pools.set(key, pool);
  }
  return pools.get(key);
}
