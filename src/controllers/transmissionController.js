import { pool, poolConnect } from '../middleware/db.js';

export const getLatestTransmissionData = async (req, res) => {
  const { tag } = req.params;

  // Validate tag (A1–A32)
  if (!/^A([1-9]|[12][0-9]|3[0-2])$/i.test(tag)) {
    return res.status(400).json({ error: 'Invalid tag format' });
  }

  const col = tag.toLowerCase(); // a1..a32

  try {
    await poolConnect;

    //  Get latest row with formatted date/time directly from Postgres
    const sql = `
      SELECT
        date1,
        time1,
        ${col} AS value
      FROM transmission_line
      WHERE ${col} IS NOT NULL
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(sql);

    if (!rows.length) {
      return res.json({ date: '-', time: '-', value: 'No data' });
    }

    const row = rows[0];

    const date =
      row.date1 instanceof Date
        ? row.date1.toISOString().split('T')[0]
        : row.date1 ?? '-';

    const timeRaw = row.time1;
    const time =
      typeof timeRaw === 'string'
        ? timeRaw.slice(0, 8)
        : timeRaw?.toString().slice(0, 8) ?? '-';

    res.json({ 
      date, 
      time, 
      value: row.value ?? 'No data', 
    });
  } catch (error) {
    console.error(' Error fetching transmission data:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};


// ----------------- RWPH TAG-BASED DATA (REPORT) -----------------

// In Postgres you should have these tables as lowercased names:
//   rwph_pump, rwph_analog, rwph_valve

const TAG_MAPPINGS = [
  // Pumps (rwph_pump)
  { label: "CLW PUMP 1", unit: "ON/OFF", tag: "R_RW_CLWT_PMP1_ON", table: "rwph_pump" },
  { label: "CLW PUMP 2", unit: "ON/OFF", tag: "R_RW_CLWT_PMP2_ON", table: "rwph_pump" },

  // Analog (rwph_analog)
  { label: "pH", unit: "pH", tag: "C_CW_PH_02", table: "rwph_analog" },
  { label: "Conductivity", unit: "µS/m", tag: "C_CW_CNDE_02", table: "rwph_analog" },
  { label: "ORP", unit: "mV", tag: "C_CW_ORP_02", table: "rwph_analog" },
  { label: "Free chlorine", unit: "mg/L", tag: "C_CW_FCLH_02", table: "rwph_analog" },
  { label: "Total chlorine", unit: "mg/L", tag: "C_CW_TCLH_02", table: "rwph_analog" },

  // Valves (rwph_valve)
  { label: "VALVE POSITION 1", unit: "%", tag: "R_RW_PDV1_POS_01", table: "rwph_valve" },
  { label: "VALVE POSITION 2", unit: "%", tag: "R_RW_PDV2_POS_02", table: "rwph_valve" }
];

export const getRWPHData = async (req, res) => {
  try {
    await poolConnect;

    const results = [];

    for (const item of TAG_MAPPINGS) {
      const { label, tag, unit, table } = item;

      // Postgres query: use $1 parameter, no TOP/CONVERT
      const sql = `
        SELECT
          date1,
          time1,
          value
        FROM ${table}
        WHERE tag = $1 AND value IS NOT NULL
        ORDER BY date1 DESC, time1 DESC
        LIMIT 1
      `;

      const { rows } = await pool.query(sql, [tag]);
      const row = rows[0];

      // Date: YYYY-MM-DD
      let date = '-';
      if (row?.date1) {
        if (row.date1 instanceof Date) {
          date = row.date1.toISOString().split('T')[0];
        } else {
          date = row.date1;
        }
      }

      // Time: HH:mm:ss
      let time = '-';
      if (row?.time1 != null) {
        const t = typeof row.time1 === 'string' ? row.time1 : row.time1.toString();
        time = t.slice(0, 8);
      }

      results.push({
        label,
        tag,
        unit,
        date,
        time,
        value: row?.value ?? "No data",
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error(" Error fetching RWPH data:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};
