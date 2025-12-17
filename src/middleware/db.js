// db.js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false }, // RDS Postgres TLS
};

export const pool = new Pool(config);

// keep a "ready" promise similar to old poolConnect
export const poolConnect = pool.connect();
