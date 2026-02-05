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

export const getRWPHCWPHData = async ({ fromTs, toTs }) => {
  //  Report date should match the window end date (6AM “sending day”)
  const reportDate = getDatePart(toTs); // "YYYY-MM-DD"
  const reportDateFormatted = formatDateToDDMMYYYY(reportDate);

  try {
    console.log(' Querying RWPH & CWPH (Postgres)…');

    // RWPH ANALOG (Updated)
    const rwphAnalogRes = await rwphPool.query(
      `
        SELECT 
               ${generateColumns(34)}
        FROM rwph_analog
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      `,
      [fromTs, toTs]
    );

    // CWPH ANALOG (Updated)
    const cwphAnalogRes = await cwphPool.query(
      `
        SELECT 
               ${generateColumns(15)}
        FROM cwph_analog
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      `,
      [fromTs, toTs]
    );

    // RWPH RUN HOURS (Updated: Excluding 'CLWT_PMP1' and 'CLWT_PMP2')
    // same logic as old T-SQL, but in Postgres style

    /**
     *  RUN HOURS (robust)
     * - Filters rows by stop moment using (date1 + time1)
     * - Uses start_time/stop_time as *timestamps* (keeps date)
     * - Sums durations across multiple runs
     * - Clips any run that crosses the window edges (optional safety)
     */

    const rwphRunHrRes = await rwphPool.query(
      `
      WITH pump_list AS (
          SELECT DISTINCT pump_name
          FROM rwph_run_hr
          WHERE pump_name NOT IN ('CLWT_PMP1', 'CLWT_PMP2')
      ),
      runs AS (
        SELECT
          pump_name,
          NULLIF(start_time::text, '')::timestamp AS start_ts,
          NULLIF(stop_time::text,  '')::timestamp AS stop_ts
        FROM rwph_run_hr
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      ),
      clipped AS (
        SELECT
          pump_name,
          GREATEST(start_ts, $1::timestamp) AS s,
          LEAST(stop_ts,  $2::timestamp) AS e
        FROM runs
        WHERE start_ts IS NOT NULL
          AND stop_ts  IS NOT NULL
          AND stop_ts > start_ts
      ),
      agg AS (
        SELECT
          pump_name,
          MIN(s) AS first_start,
          MAX(e) AS last_stop,
          SUM(e - s) AS total_duration
        FROM clipped
        GROUP BY pump_name
      )
        SELECT
          to_char($2::timestamp, 'DD-MM-YYYY') AS "DATE",
          pl.pump_name AS "PUMP_NAME",
          COALESCE(to_char(a.first_start, 'HH24:MI:SS'), '00:00:00') AS "START_TIME",
          COALESCE(to_char(a.last_stop, 'HH24:MI:SS'), '00:00:00')  AS "STOP_TIME",
          COALESCE(to_char(a.total_duration,   'HH24:MI:SS'), '00:00:00') AS "DURATION"
        FROM pump_list pl
        LEFT JOIN agg a ON a.pump_name = pl.pump_name
        ORDER BY pl.pump_name;
      `,
      [fromTs, toTs]
    );


    // CWPH RUN HOURS (Similar to RWPH RUN HOURS, just replace 'RWPH' with 'CWPH')
     const cwphRunHrRes = await cwphPool.query(
      `
        WITH pump_list AS (
          SELECT DISTINCT pump_name
          FROM cwph_run_hr
        ),
        runs AS (
        SELECT
          pump_name,
          NULLIF(start_time::text, '')::timestamp AS start_ts,
          NULLIF(stop_time::text,  '')::timestamp AS stop_ts
        FROM cwph_run_hr
        WHERE (date1 + time1) >= $1::timestamp
          AND (date1 + time1) <  $2::timestamp
      ),
      clipped AS (
        SELECT
          pump_name,
          GREATEST(start_ts, $1::timestamp) AS s,
          LEAST(stop_ts,  $2::timestamp) AS e
        FROM runs
        WHERE start_ts IS NOT NULL
          AND stop_ts  IS NOT NULL
          AND stop_ts > start_ts
      ),
      agg AS (
        SELECT
          pump_name,
          MIN(s) AS first_start,
          MAX(e) AS last_stop,
          SUM(e - s) AS total_duration
        FROM clipped
        GROUP BY pump_name
      )
        SELECT
          to_char($2::timestamp, 'DD-MM-YYYY') AS "DATE",
          pl.pump_name AS "PUMP_NAME",
          COALESCE(to_char(a.first_start, 'HH24:MI:SS'), '00:00:00') AS "START_TIME",
          COALESCE(to_char(a.last_stop, 'HH24:MI:SS'), '00:00:00')  AS "STOP_TIME",
          COALESCE(to_char(a.total_duration,   'HH24:MI:SS'), '00:00:00') AS "DURATION"
        FROM pump_list pl
        LEFT JOIN agg a ON a.pump_name = pl.pump_name
        ORDER BY pl.pump_name;
      `,
      [fromTs, toTs]
    );

    return {
      data: {
        rwph: rwphAnalogRes.rows[0] || {},
        cwph: cwphAnalogRes.rows[0] || {},
        rwphRunHr: rwphRunHrRes.rows || [],
        cwphRunHr: cwphRunHrRes.rows || [],
      },
      reportDate, // "YYYY-MM-DD" (end day)
      reportDateFormatted, // "DD-MM-YYYY" (end day)
    };

  } catch (err) {
    console.error('❌ DB Query Error (RWPH/CWPH):', err);
    return null;
  }
};
