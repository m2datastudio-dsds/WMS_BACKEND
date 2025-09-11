// src/services/reportService.js
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

export const getTransmissionLineData = async () => {
  const reportDate = getYesterdayDate(); // 'YYYY-MM-DD'
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate); // 'DD-MM-YYYY'

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

  try {
    const pool = await mssql.connect(config);

    const result = await pool.request()
      .input('date', mssql.Date, reportDate)
      .query(`
        SELECT 
          DATE1,
          ${Array.from({ length: 32 }, (_, i) => {
            const tag = `A${i + 1}`;
            return `MAX(${tag}) AS Max_${tag}, MIN(${tag}) AS Min_${tag}, AVG(${tag}) AS Avg_${tag}`;
          }).join(',\n')}
        FROM dbo.TRANSMISSION_LINE
        WHERE DATE1 = @date
        GROUP BY DATE1
      `);

    return {
      data: result.recordset, // your existing usage
      reportDate,             // 'YYYY-MM-DD'
      reportDateFormatted     // 'DD-MM-YYYY'
    };
  } catch (err) {
    console.error('DB Query Error:', err);
    return null;
  }
};
