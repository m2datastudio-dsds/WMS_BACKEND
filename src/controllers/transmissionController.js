import { pool, poolConnect } from '../middleware/db.js';

export const getLatestTransmissionData = async (req, res) => {
  const { tag } = req.params;

  // Validate tag (A1–A32)
  if (!/^A([1-9]|[12][0-9]|3[0-2])$/.test(tag)) {
    return res.status(400).json({ error: 'Invalid tag format' });
  }

  try {
    await poolConnect;

    // ✅ Get latest row with formatted date/time directly from SQL
    const query = `
      SELECT TOP 1 
        CONVERT(VARCHAR(10), DATE1, 120) AS DateFormatted,
        CONVERT(VARCHAR(8), TIME1, 108) AS TimeFormatted,
        ${tag}
      FROM TRANSMISSION_LINE
      WHERE ${tag} IS NOT NULL
      ORDER BY DATE1 DESC, TIME1 DESC
    `;

    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      return res.json({ date: '-', time: '-', value: 'No data' });
    }

    const row = result.recordset[0];

    const date = row.DateFormatted || '-';
    const time = row.TimeFormatted || '-';
    const value = row[tag] ?? 'No data';

    res.json({ date, time, value });
  } catch (error) {
    console.error('❌ Error fetching transmission data:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};


const TAG_MAPPINGS = [
  // Pumps (RWPH_PUMP)
  { label: "CLW PUMP 1", unit: "ON/OFF", tag: "R_RW_CLWT_PMP1_ON", table: "RWPH_PUMP" },
  { label: "CLW PUMP 2", unit: "ON/OFF", tag: "R_RW_CLWT_PMP2_ON", table: "RWPH_PUMP" },

  // Analog (RWPH_ANALOG)
  { label: "pH", unit: "pH", tag: "C_CW_PH_02", table: "RWPH_ANALOG" },
  { label: "Conductivity", unit: "µS/m", tag: "C_CW_CNDE_02", table: "RWPH_ANALOG" },
  { label: "ORP", unit: "mV", tag: "C_CW_ORP_02", table: "RWPH_ANALOG" },
  { label: "Free chlorine", unit: "mg/L", tag: "C_CW_FCLH_02", table: "RWPH_ANALOG" },
  { label: "Total chlorine", unit: "mg/L", tag: "C_CW_TCLH_02", table: "RWPH_ANALOG" },

  // Valves (RWPH_VALVE)
  { label: "VALVE POSITION 1", unit: "%", tag: "R_RW_PDV1_POS_01", table: "RWPH_VALVE" },
  { label: "VALVE POSITION 2", unit: "%", tag: "R_RW_PDV2_POS_02", table: "RWPH_VALVE" }
];

export const getRWPHData = async (req, res) => {
  try {
    await poolConnect;

    const results = [];

    for (const item of TAG_MAPPINGS) {
      const { label, tag, unit, table } = item;

      const query = `
        SELECT TOP 1 
          CONVERT(VARCHAR(10), DATE1, 120) AS DateFormatted,
          CONVERT(VARCHAR(8), TIME1, 108) AS TimeFormatted,
          Value
        FROM ${table}
        WHERE Tag = @tag AND Value IS NOT NULL
        ORDER BY DATE1 DESC, TIME1 DESC
      `;

      const request = pool.request();
      request.input("tag", tag);

      const result = await request.query(query);
      const record = result.recordset[0];

      results.push({
        label,
        tag,
        unit,
        date: record?.DateFormatted ?? "-",
        time: record?.TimeFormatted ?? "-",
        value: record?.Value ?? "No data"
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("❌ Error fetching RWPH data:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};
