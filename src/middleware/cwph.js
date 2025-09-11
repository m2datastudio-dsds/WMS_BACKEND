// src/middleware/cwph.js
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const pools = new Map();

/**
 * Get (or create) a pooled connection to the CWPH DB.
 * Uses shared server/user/pass from .env and the CWPH database name.
 */
export async function getPool(dbName) {
  const key = `cwph:${dbName}`;
  if (pools.has(key)) return pools.get(key);

  const pool = new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: dbName, // <— CWPH_DB
    options: { encrypt: true, trustServerCertificate: true },
  });

  const ready = pool.connect();
  pools.set(key, ready.then(() => pool));
  return ready.then(() => pool);
}
