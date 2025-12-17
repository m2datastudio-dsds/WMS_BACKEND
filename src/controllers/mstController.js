import { pool, poolConnect } from '../middleware/db.js';

const MSS_TAGS = {
  MST_01: {
    name: "MST-Pannimadai",
    tags: {
      "Level Transmitter 1": "A1", // m
      "Level Transmitter 2": "A2", // m
      "Pressure Transmitter": "A3", // mH₂O
      "Pressure Transmitter 2": "A4", // mH₂O 
      "Flow transmitter 1": "A5", // m³/hr
      "Flow transmitter 2": "A6", // m³/hr
      "Flow totaliser 1": "A7", // S/m
      "Flow totaliser 2": "A8", // mg/L
      "Chlorine sensor": "A9", // P/H
      "Conductivity sensor": "A10", // mV
      "PH": "A11", // m³
      "Oxidation reduction potential": "A12", // m³
      "Vandalism": "A39" //  from vandalism table
    }
  }
};

export const getMSSAnalogDetails = async (req, res) => {
  try {
    await poolConnect;

    // Build required tag fields from all MSS tags
    const allRequiredTags = new Set();
    Object.values(MSS_TAGS).forEach(mss =>
      Object.values(mss.tags).forEach(tag => allRequiredTags.add(tag))
    );

    const vandalTag = 'A39';

    const tagColumns = Array
      .from(allRequiredTags)
      .filter(tag => tag !== vandalTag)
      .map(tag => tag.toLowerCase())
      .join(', ');

    // Query to get the latest MSS row
    const analogSql = `
      SELECT
        date1,
        time1,
        ${tagColumns}
      FROM mss_analog
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    // --- Query 2: VANDALISM ---
    const vandalSql = `
      SELECT
        a39
      FROM vandalism
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    const [analogResult, vandalResult] = await Promise.all([
      pool.query(analogSql),
      pool.query(vandalSql),
    ]);

    if (!analogResult.rows.length) {
      return res.status(404).json({ error: 'No MSS data found' });
    }

    const analogRow = analogResult.rows[0];
    const vandalRow = vandalResult.rows[0] || {};

    const date =
      analogRow.date1 instanceof Date
        ? analogRow.date1.toISOString().split('T')[0]
        : analogRow.date1 ?? '-';

    const timeRaw = analogRow.time1;
    const time =
      typeof timeRaw === 'string'
        ? timeRaw.slice(0, 8)
        : timeRaw?.toString().slice(0, 8) ?? '-';

    const vandalismValue = vandalRow.a39 ?? '-';

    const data = {};

    // Loop through MSS_TAGS and assign data for each MSS
    for (const [mssKey, mssInfo] of Object.entries(MSS_TAGS)) {
      data[mssKey] = {
        name: mssInfo.name,
        date,
        time,
        sensors: {}
      };

      // Map each sensor with its corresponding value from the database
      for (const [sensorLabel, tag] of Object.entries(mssInfo.tags)) {
        if (tag === vandalTag) {
          data[mssKey].sensors[sensorLabel] = vandalismValue;
        } else {
          const col = tag.toLowerCase();
          data[mssKey].sensors[sensorLabel] = analogRow[col] ?? '-';
        }
      }
    }

    res.json({ data });
  } catch (error) {
    console.error(' Error fetching MSS_ANALOG:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
