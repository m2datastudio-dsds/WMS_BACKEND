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

export const getRWPHCWPHData = async () => {
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
    console.log('✅ Connected to RWPH & CWPH');

    // RWPH ANALOG (Updated)
    const rwphResult = await pool.request()
      .input('date', mssql.Date, reportDate)
      .query(`
        SELECT DATE1,
        ${generateColumns(34)}
        FROM RWPH.dbo.RWPH_ANALOG
        WHERE DATE1 = @date
        GROUP BY DATE1
      `);

    // CWPH ANALOG (Updated)
    const cwphResult = await pool.request()
      .input('date', mssql.Date, reportDate)
      .query(`
        SELECT DATE1,
        ${generateColumns(15)}
        FROM CWPH.dbo.CWPH_ANALOG
        WHERE DATE1 = @date
        GROUP BY DATE1
      `);

    // RWPH RUN HOURS (Updated: Excluding 'CLWT_PMP1' and 'CLWT_PMP2')
    const rwphRunHrResult = await pool.request()
      .query(`
        WITH PumpList AS (
          SELECT DISTINCT PUMP_NAME
          FROM RWPH.dbo.RWPH_RUN_HR
          WHERE PUMP_NAME NOT IN ('CLWT_PMP1', 'CLWT_PMP2')
        ),
        PumpRunData AS (
          SELECT
            DATE1 AS [DATE],
            PUMP_NAME,
            MIN(START_TIME) AS START_TIME,
            MAX(STOP_TIME) AS STOP_TIME,
            CONVERT(VARCHAR, DATEADD(SECOND, DATEDIFF(SECOND, MIN(START_TIME), MAX(STOP_TIME)), 0), 108) AS DURATION
          FROM RWPH.dbo.RWPH_RUN_HR
          WHERE DATE1 = CAST(DATEADD(DAY, -1, CAST(GETDATE() AS DATE)) AS DATE) 
          GROUP BY PUMP_NAME, DATE1
        )
        SELECT
          FORMAT(CAST(DATEADD(DAY, -1, CAST(GETDATE() AS DATE)) AS DATE), 'dd-MM-yyyy') AS [DATE],
          pl.PUMP_NAME,
          ISNULL(CONVERT(VARCHAR, pr.START_TIME, 108), '00:00:00') AS START_TIME,
          ISNULL(CONVERT(VARCHAR, pr.STOP_TIME, 108), '00:00:00') AS STOP_TIME,
          ISNULL(pr.DURATION, '00:00:00') AS DURATION
        FROM
          PumpList pl
        LEFT JOIN
          PumpRunData pr ON pl.PUMP_NAME = pr.PUMP_NAME
        ORDER BY
          pl.PUMP_NAME;
      `);

    // CWPH RUN HOURS (Similar to RWPH RUN HOURS, just replace 'RWPH' with 'CWPH')
    const cwphRunHrResult = await pool.request()
      .query(`
        WITH PumpList AS (
          SELECT DISTINCT PUMP_NAME FROM CWPH.dbo.CWPH_RUN_HR
        ),
        PumpRunData AS (
          SELECT
            DATE1 AS [DATE],
            PUMP_NAME,
            MIN(START_TIME) AS START_TIME,
            MAX(STOP_TIME) AS STOP_TIME,
            CONVERT(VARCHAR, DATEADD(SECOND, DATEDIFF(SECOND, MIN(START_TIME), MAX(STOP_TIME)), 0), 108) AS DURATION
          FROM CWPH.dbo.CWPH_RUN_HR
          WHERE DATE1 = CAST(DATEADD(DAY, -1, CAST(GETDATE() AS DATE)) AS DATE)
          GROUP BY PUMP_NAME, DATE1
        )
        SELECT
          FORMAT(CAST(DATEADD(DAY, -1, CAST(GETDATE() AS DATE)) AS DATE), 'dd-MM-yyyy') AS [DATE],
          pl.PUMP_NAME,
          ISNULL(CONVERT(VARCHAR, pr.START_TIME, 108), '00:00:00') AS START_TIME,
          ISNULL(CONVERT(VARCHAR, pr.STOP_TIME, 108), '00:00:00') AS STOP_TIME,
          ISNULL(pr.DURATION, '00:00:00') AS DURATION
        FROM
          PumpList pl
        LEFT JOIN
          PumpRunData pr ON pl.PUMP_NAME = pr.PUMP_NAME
        ORDER BY
          pl.PUMP_NAME;
      `);

    return {
      data: {
        rwph: rwphResult.recordset[0] || {},
        cwph: cwphResult.recordset[0] || {},
        rwphRunHr: rwphRunHrResult.recordset || [],
        cwphRunHr: cwphRunHrResult.recordset || [],
      },
      reportDate,
      reportDateFormatted,
    };

  } catch (err) {
    console.error('❌ DB Query Error (RWPH/CWPH):', err);
    return null;
  }
};
