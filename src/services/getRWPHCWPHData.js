import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

// One pool per DB (RWPH & CWPH) on the same RDS Postgres server
const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 5432),
  ssl: { rejectUnauthorized: false }, // RDS Postgres
};

const rwphPool = new Pool({
  ...baseConfig,
  database: process.env.RWPH_DB_DATABASE || 'RWPH',
});

const cwphPool = new Pool({
  ...baseConfig,
  database: process.env.CWPH_DB_DATABASE || 'CWPH',
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

// MAX/MIN/AVG for A1..An — physical cols are lowercase a1,a2,...
const generateColumns = (count) =>
  Array.from({ length: count }, (_, i) => {
    const tag = `A${i + 1}`;   // logical name in report
    const col = `a${i + 1}`;   // column name in Postgres
    return `
      MAX(${col}) AS "Max_${tag}",
      MIN(${col}) AS "Min_${tag}",
      AVG(${col}) AS "Avg_${tag}"
    `;
  }).join(',\n');

export const getRWPHCWPHData = async () => {
  const reportDate = getYesterdayDate();
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate);

  try {
    console.log(' Querying RWPH & CWPH (Postgres)…');

    // RWPH ANALOG (Updated)
    const rwphAnalogRes = await rwphPool.query(
      `
        SELECT date1,
               ${generateColumns(34)}
        FROM rwph_analog
        WHERE date1 = $1
        GROUP BY date1
      `,
      [reportDate]
    );

    // CWPH ANALOG (Updated)
    const cwphAnalogRes = await cwphPool.query(
      `
        SELECT date1,
               ${generateColumns(15)}
        FROM cwph_analog
        WHERE date1 = $1
        GROUP BY date1
      `,
      [reportDate]
    );

    // RWPH RUN HOURS (Updated: Excluding 'CLWT_PMP1' and 'CLWT_PMP2')
    // same logic as old T-SQL, but in Postgres style
    const rwphRunHrRes = await rwphPool.query(
      `
        WITH pump_list AS (
          SELECT DISTINCT pump_name
          FROM rwph_run_hr
          WHERE pump_name NOT IN ('CLWT_PMP1', 'CLWT_PMP2')
        ),
        pump_run_data AS (
          SELECT
            date1 AS date,
            pump_name,
            MIN(start_time) AS start_time,
            MAX(stop_time) AS stop_time,
            (MAX(stop_time) - MIN(start_time)) AS duration
          FROM rwph_run_hr
          WHERE date1 = $1::date
          GROUP BY pump_name, date1
        )
        SELECT
          to_char($1::date, 'DD-MM-YYYY')        AS "DATE",
          pl.pump_name                           AS "PUMP_NAME",
          COALESCE(to_char(pr.start_time, 'HH24:MI:SS'), '00:00:00') AS "START_TIME",
          COALESCE(to_char(pr.stop_time, 'HH24:MI:SS'), '00:00:00')  AS "STOP_TIME",
          COALESCE(to_char(pr.duration,   'HH24:MI:SS'), '00:00:00') AS "DURATION"
        FROM pump_list pl
        LEFT JOIN pump_run_data pr
          ON pl.pump_name = pr.pump_name
        ORDER BY pl.pump_name;
      `,
      [reportDate]
    );


    // CWPH RUN HOURS (Similar to RWPH RUN HOURS, just replace 'RWPH' with 'CWPH')
     const cwphRunHrRes = await cwphPool.query(
      `
        WITH pump_list AS (
          SELECT DISTINCT pump_name
          FROM cwph_run_hr
        ),
        pump_run_data AS (
          SELECT
            date1 AS date,
            pump_name,
            MIN(start_time) AS start_time,
            MAX(stop_time) AS stop_time,
            (MAX(stop_time) - MIN(start_time)) AS duration
          FROM cwph_run_hr
          WHERE date1 = $1::date
          GROUP BY pump_name, date1
        )
        SELECT
          to_char($1::date, 'DD-MM-YYYY')        AS "DATE",
          pl.pump_name                           AS "PUMP_NAME",
          COALESCE(to_char(pr.start_time, 'HH24:MI:SS'), '00:00:00') AS "START_TIME",
          COALESCE(to_char(pr.stop_time, 'HH24:MI:SS'), '00:00:00')  AS "STOP_TIME",
          COALESCE(to_char(pr.duration,   'HH24:MI:SS'), '00:00:00') AS "DURATION"
        FROM pump_list pl
        LEFT JOIN pump_run_data pr
          ON pl.pump_name = pr.pump_name
        ORDER BY pl.pump_name;
      `,
      [reportDate]
    );

    return {
      data: {
        rwph: rwphAnalogRes.rows[0] || {},
        cwph: cwphAnalogRes.rows[0] || {},
        rwphRunHr: rwphRunHrRes.rows || [],
        cwphRunHr: cwphRunHrRes.rows || [],
      },
      reportDate,
      reportDateFormatted,
    };

  } catch (err) {
    console.error('❌ DB Query Error (RWPH/CWPH):', err);
    return null;
  }
};
