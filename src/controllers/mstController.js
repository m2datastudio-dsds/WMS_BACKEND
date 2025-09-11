import { pool, poolConnect } from '../middleware/db.js';

const MSS_TAGS = {
  MST_01: {
    name: "MST-Pannimadai",
    tags: {
      "Level Transmitter 1": "A1", // m
      "Level Transmitter 2": "A2", // m
      "Pressure Transmitter": "A3", // mH₂O
      "Flow transmitter 1": "A5", // m³/hr
      "Flow transmitter 2": "A6", // m³/hr
      "Flow totaliser 1": "A7", // S/m
      "Flow totaliser 2": "A8", // mg/L
      "Chlorine sensor": "A9", // P/H
      "Conductivity sensor": "A10", // mV
      "PH": "A11", // m³
      "Oxidation reduction potential": "A12", // m³
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
    const tagList = Array.from(allRequiredTags).join(', ');

    // Query to get the latest MSS row
    const query = `
      SELECT TOP 1
        CONVERT(VARCHAR(10), DATE1, 120) AS DateFormatted,
        CONVERT(VARCHAR(8), TIME1, 108) AS TimeFormatted,
        ${tagList}
      FROM MSS_ANALOG
      ORDER BY DATE1 DESC, TIME1 DESC
    `;

    const result = await pool.request().query(query);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'No MSS data found' });
    }

    const row = result.recordset[0];
    const date = row.DateFormatted;
    const time = row.TimeFormatted;

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
        data[mssKey].sensors[sensorLabel] = row[tag] ?? '-';
      }
    }

    res.json({ data });
  } catch (error) {
    console.error('❌ Error fetching MSS_ANALOG:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
