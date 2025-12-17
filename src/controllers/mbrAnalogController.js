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
      "OCND": "A21",
      "Vandalism": "A33" //  from VANDALISM table
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
      "OCND": "A22",
      "Vandalism": "A34" //  from VANDALISM table
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
      "OCND": "A23",
      "Vandalism": "A35" //  from VANDALISM table
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
      "OCND": "A24",
      "Vandalism": "A36" //  from VANDALISM table
    }
  }
};

export const getMBRAnalogDetails = async (req, res) => {
  try {
    // for Postgres this is basically a one-time connection check
    await poolConnect;

    // Build required tag fields from all MBRs
    const allRequiredTags = new Set();
    Object.values(MBR_TAGS).forEach(mbr =>
      Object.values(mbr.tags).forEach(tag => allRequiredTags.add(tag))
    );

    const vandalTags = ['A33', 'A34', 'A35', 'A36'];

    const tagColumns = Array
      .from(allRequiredTags)
      .filter(tag => !vandalTags.includes(tag))
      .map(tag => tag.toLowerCase()) // a1, a2, ...
      .join(', ');

    //  Query to get latest row in proper order with formatted values
    const analogSql = `
      SELECT
        date1,
        time1,
        ${tagColumns}
      FROM mbr_analog
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    // --- Query 2: VANDALISM ---
    const vandalSql = `
      SELECT
        a33, a34, a35, a36
      FROM vandalism
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    const [analogResult, vandalResult] = await Promise.all([
      pool.query(analogSql),
      pool.query(vandalSql),
    ]);

    if (!analogResult.rows.length) {
      return res.status(404).json({ error: 'No MBR data found' });
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

    const data = {};

    for (const [mbrKey, mbrInfo] of Object.entries(MBR_TAGS)) {
      data[mbrKey] = {
        name: mbrInfo.name,
        date,
        time,
        sensors: {},
      };

      for (const [sensorLabel, tag] of Object.entries(mbrInfo.tags)) {
        if (vandalTags.includes(tag)) {
          const col = tag.toLowerCase(); // a33...
          data[mbrKey].sensors[sensorLabel] = vandalRow[col] ?? '-';
        } else {
          const col = tag.toLowerCase(); // a1...
          data[mbrKey].sensors[sensorLabel] = analogRow[col] ?? '-';
        }
      }
    }

    res.json({ data });
  } catch (error) {
    console.error(' Error fetching MBR_ANALOG:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
