// src/services/reportService.js
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE,  // MEIL_PILLUR on Postgres
  ssl: { rejectUnauthorized: false }, // RDS Postgres
});

const getYesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
};

const formatDateToDDMMYYYY = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

// Build MAX/MIN/AVG on physical cols a1..a32 but keep aliases Max_A1, etc.
const generateColumns = (count) =>
  Array.from({ length: count }, (_, i) => {
    const tag = `A${i + 1}`;   // logical name
    const col = `a${i + 1}`;   // actual column in Postgres
    return `
      MAX(${col}) AS "Max_${tag}",
      MIN(${col}) AS "Min_${tag}",
      AVG(${col}) AS "Avg_${tag}"
    `;
  }).join(',\n');

export const getTransmissionLineData = async () => {
  const reportDate = getYesterdayDate(); // 'YYYY-MM-DD'
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate); // 'DD-MM-YYYY'

  try {
    const sql = `
      SELECT 
        date1 AS "DATE1",
        ${generateColumns(32)}
      FROM transmission_line
      WHERE date1 = $1
      GROUP BY date1
    `;

    const { rows } = await pool.query(sql, [reportDate]);

    return {
      data: rows,           // same usage as old: result.recordset
      reportDate,           // 'YYYY-MM-DD'
      reportDateFormatted,  // 'DD-MM-YYYY'
    };
  } catch (err) {
    console.error('DB Query Error:', err);
    return null;
  }
};
