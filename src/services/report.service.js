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

export const getTransmissionLineData = async ({ fromTs, toTs }) => {
  //  Report date should match the window end date (6AM “sending day”)
  const reportDate = getDatePart(toTs); // "YYYY-MM-DD"
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate); // 'DD-MM-YYYY'

  try {
    const sql = `
      SELECT 
        ${generateColumns(32)}
      FROM transmission_line
      WHERE (date1 + time1) >= $1::timestamp
        AND (date1 + time1) <  $2::timestamp
    `;

    const { rows } = await pool.query(sql, [fromTs, toTs]);

    return {
      data: rows || [],           // same usage as old: result.recordset
      reportDate,           // "YYYY-MM-DD" (end day)
      reportDateFormatted,  // "DD-MM-YYYY" (end day)
    };
  } catch (err) {
    console.error('DB Query Error:', err);
    return null;
  }
};
