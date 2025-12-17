// src/services/getMSTMSRMBRData.js

import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

// Re-use your main Postgres DB (MEIL_PILLUR)
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE,
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

// Generate MAX/MIN/AVG expressions for A1..An
// Columns in Postgres are lowercase (a1, a2, ...)
// but we keep the aliases as "Max_A1" etc to match old MSSQL output
const generateColumns = (count) => {
  return Array.from({ length: count }, (_, i) => {
    const tag = `A${i + 1}`;      // logical tag
    const col = `a${i + 1}`;      // physical column in Postgres
    return `
      MAX(${col}) AS "Max_${tag}",
      MIN(${col}) AS "Min_${tag}",
      AVG(${col}) AS "Avg_${tag}"
    `;
  }).join(',\n');
};

export const getMSTMSRMBRData = async () => {
  const reportDate = getYesterdayDate();
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate);

  try {
    // MSS: A1–A12
    const mstResult = await pool.query(
      `
        SELECT date1,
               ${generateColumns(12)}
        FROM mss_analog
        WHERE date1 = $1
        GROUP BY date1
      `,
      [reportDate]
    );

    // MSR: A1–A12
    const msrResult = await pool.query(
      `
        SELECT date1,
               ${generateColumns(12)}
        FROM msr_analog
        WHERE date1 = $1
        GROUP BY date1
      `,
      [reportDate]
    );

    // MBR: A1–A24
    const mbrResult = await pool.query(
      `
        SELECT date1,
               ${generateColumns(24)}
        FROM mbr_analog
        WHERE date1 = $1
        GROUP BY date1
      `,
      [reportDate]
    );
    
    return {
      data: {
        mst: mstResult.recordset[0] || {},
        msr: msrResult.recordset[0] || {},
        mbr: mbrResult.recordset[0] || {},
      },
      reportDate,
      reportDateFormatted,
    };
  } catch (err) {
    console.error('❌ DB Query Error (MST/MSR/MBR):', err);
    return null;
  }
};
