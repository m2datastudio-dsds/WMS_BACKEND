// src/db.js
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

// Base config for ALL RWPH DB connections (Postgres on RDS)
const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_SERVER,          // e.g. your RDS endpoint
  port:     Number(process.env.DB_PORT || 5432),
  ssl: { rejectUnauthorized: false },       // typical for RDS Postgres
};

// simple pool cache by db name
const pools = new Map();

/** Get (or create) a pool for a given database */
export async function getPool(dbName = process.env.DB_DATABASE) {
  if (!pools.has(dbName)) {
  const pool = new Pool({
      ...baseConfig,
      database: dbName,
    });
    pools.set(dbName, pool);
  }
  // For pg, there's no separate "connect promise" you must await each time;
  // just return the Pool and use pool.query(...)
  return pools.get(dbName);
}

