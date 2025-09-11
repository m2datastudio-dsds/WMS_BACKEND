// src/services/getMSTMSRMBRData.js

import mssql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const getYesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
};

const formatDateToDDMMYYYY = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

export const getMSTMSRMBRData = async () => {
  const reportDate = getYesterdayDate();
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate);

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  const generateColumns = (count) => {
    return Array.from({ length: count }, (_, i) => {
      const tag = `A${i + 1}`;
      return `MAX(${tag}) AS Max_${tag}, MIN(${tag}) AS Min_${tag}, AVG(${tag}) AS Avg_${tag}`;
    }).join(',\n');
  };

  try {
    const pool = await mssql.connect(config);

    // MSS: A1–A12
    const mstResult = await pool.request()
      .input('date', mssql.Date, reportDate)
      .query(`
        SELECT DATE1,
        ${generateColumns(12)}
        FROM dbo.MSS_ANALOG
        WHERE DATE1 = @date
        GROUP BY DATE1
      `);

    // MSR: A1–A12
    const msrResult = await pool.request()
      .input('date', mssql.Date, reportDate)
      .query(`
        SELECT DATE1,
        ${generateColumns(12)}
        FROM dbo.MSR_ANALOG
        WHERE DATE1 = @date
        GROUP BY DATE1
      `);

    // MBR: A1–A24
    const mbrResult = await pool.request()
      .input('date', mssql.Date, reportDate)
      .query(`
        SELECT DATE1,
        ${generateColumns(24)}
        FROM dbo.MBR_ANALOG
        WHERE DATE1 = @date
        GROUP BY DATE1
      `);

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
