// src/db.js
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  options: { encrypt: true, trustServerCertificate: true },
};

// simple pool cache by db name
const pools = new Map();

/** Get (or create) a pool for a given database */
export async function getPool(dbName = process.env.DB_DATABASE) {
  if (!pools.has(dbName)) {
    const pool = new sql.ConnectionPool({ ...baseConfig, database: dbName });
    const poolConnect = pool.connect();
    pools.set(dbName, { pool, poolConnect });
  }
  const entry = pools.get(dbName);
  await entry.poolConnect; // ensure connected
  return entry.pool;
}

export { sql };
