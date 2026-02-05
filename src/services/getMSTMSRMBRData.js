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

// const getYesterdayDate = () => {
//   const date = new Date();
//   date.setDate(date.getDate() - 1);
//   return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
// };

const formatDateToDDMMYYYY = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

// toTs -> "YYYY-MM-DD" (assumes toTs is ISO string or "YYYY-MM-DD HH:mm:ss")
const getDatePart = (ts) => String(ts).split("T")[0].split(" ")[0];

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

export const getMSTMSRMBRData = async ({ fromTs, toTs }) => {
  //  Report date should match the window end date (6AM “sending day”)
  const reportDate = getDatePart(toTs); // "YYYY-MM-DD"
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate);

  try {
    // MSS: A1–A12
    const mstResult = await pool.query(
      `
        SELECT
               ${generateColumns(12)}
        FROM mss_analog
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      `,
      [fromTs, toTs]
    );

    // MSR: A1–A12
    const msrResult = await pool.query(
      `
        SELECT 
               ${generateColumns(12)}
        FROM msr_analog
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      `,
      [fromTs, toTs]
    );

    // MBR: A1–A24
    const mbrResult = await pool.query(
      `
        SELECT
               ${generateColumns(24)}
        FROM mbr_analog
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      `,
      [fromTs, toTs]
    );
    
    return {
      data: {
        mst: mstResult.rows[0] || {},
        msr: msrResult.rows[0] || {},
        mbr: mbrResult.rows[0] || {},
      },
      reportDate, // "YYYY-MM-DD" (end day)
      reportDateFormatted, // "DD-MM-YYYY" (end day)
    };
  } catch (err) {
    console.error('❌ DB Query Error (MST/MSR/MBR):', err);
    return null;
  }
};
