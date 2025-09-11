import { pool, poolConnect } from '../middleware/db.js';

// Tag mappings for each MBR station
const MBR_TAGS = {
  MBR_01: {
    name: "Valarmathi Nagar",
    tags: {
      "ULT 1": "A1",
      "PT 1": "A5",
      "FT 1": "A9",
      "FT_TT": "A13",
      "OCLR": "A17",
      "OCND": "A21"
    }
  },
  MBR_02: {
    name: "Bharathi Park",
    tags: {
      "ULT 2": "A2",
      "PT 2": "A6",
      "FT 2": "A10",
      "FT_TT": "A14",
      "OCLR": "A18",
      "OCND": "A22"
    }
  },
  MBR_03: {
    name: "Press Enclave",
    tags: {
      "ULT 3": "A3",
      "PT 3": "A7",
      "FT 3": "A11",
      "FT_TT": "A15",
      "OCLR": "A19",
      "OCND": "A23"
    }
  },
  MBR_04: {
    name: "Pilliyarpuram",
    tags: {
      "ULT 4": "A4",
      "PT 4": "A8",
      "FT 4": "A12",
      "FT_TT": "A16",
      "OCLR": "A20",
      "OCND": "A24"
    }
  }
};

export const getMBRAnalogDetails = async (req, res) => {
  try {
    await poolConnect;

    // Build required tag fields from all MBRs
    const allRequiredTags = new Set();
    Object.values(MBR_TAGS).forEach(mbr =>
      Object.values(mbr.tags).forEach(tag => allRequiredTags.add(tag))
    );
    const tagList = Array.from(allRequiredTags).join(', ');

    // ✅ Query to get latest row in proper order with formatted values
    const query = `
      SELECT TOP 1
        CONVERT(VARCHAR(10), DATE1, 120) AS DateFormatted,
        CONVERT(VARCHAR(8), TIME1, 108) AS TimeFormatted,
        ${tagList}
      FROM MBR_ANALOG
      ORDER BY DATE1 DESC, TIME1 DESC
    `;

    const result = await pool.request().query(query);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'No MBR data found' });
    }

    const row = result.recordset[0];
    const date = row.DateFormatted;
    const time = row.TimeFormatted;

    const data = {};

    for (const [mbrKey, mbrInfo] of Object.entries(MBR_TAGS)) {
      data[mbrKey] = {
        name: mbrInfo.name,
        date,
        time,
        sensors: {}
      };

      for (const [sensorLabel, tag] of Object.entries(mbrInfo.tags)) {
        data[mbrKey].sensors[sensorLabel] = row[tag] ?? '-';
      }
    }

    res.json({ data });
  } catch (error) {
    console.error('❌ Error fetching MBR_ANALOG:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
