import { pool, poolConnect } from '../middleware/db.js'; 
const MSR_TAGS = {
  MSR_01: {
    name: "MSR - Ramakrishnapuram old",   // ✅ Corrected
    tags: {
      "ULT 1": "A1",    
      "PT 1": "A2",     
      "OCLR": "A3",     
      "OCND": "A4",   
      "FT 1": "A5",     
      "FT_TT": "A6",
      "Vandalism": "A37" //  from VANDALISM table  
    }
  },
  MSR_02: {
    name: "MSR - Ramakrishnapuram new",   // ✅ Corrected
    tags: {
      "ULT 2": "A7",    
      "PT 2": "A8",    
      "OCLR": "A9",     
      "OCND": "A10",   
      "FT 2": "A11",    
      "FT_TT": "A12",
      "Vandalism": "A38" //  from VANDALISM table   
    }
  }
};


export const getMSRAnalogDetails = async (req, res) => {
  try {
    // Establish a connection to the database
    await poolConnect;

    // Build required tag fields from all MSR tags
    const allRequiredTags = new Set();
    Object.values(MSR_TAGS).forEach(msr =>
      Object.values(msr.tags).forEach(tag => allRequiredTags.add(tag))
    );

    const vandalTags = ['A37', 'A38'];

    const tagColumns = Array
      .from(allRequiredTags)
      .filter(tag => !vandalTags.includes(tag))
      .map(tag => tag.toLowerCase())
      .join(', ');

    // Query to get the latest MSR row
    const analogSql = `
      SELECT
        date1,
        time1,
        ${tagColumns}
      FROM msr_analog
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    // --- Query 2: VANDALISM ---
    const vandalSql = `
      SELECT
        a37, a38
      FROM vandalism
      ORDER BY date1 DESC, time1 DESC
      LIMIT 1
    `;

    // Execute the query
    const [analogResult, vandalResult] = await Promise.all([
      pool.query(analogSql),
      pool.query(vandalSql),
    ]);

    if (!analogResult.rows.length) {
      return res.status(404).json({ error: 'No MSR data found' });
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

    // Loop through MSR_TAGS and assign data for each MSR
    for (const [msrKey, msrInfo] of Object.entries(MSR_TAGS)) {
      data[msrKey] = {
        name: msrInfo.name,
        date,
        time,
        sensors: {}
      };

      // Map each sensor with its corresponding value from the database
      for (const [sensorLabel, tag] of Object.entries(msrInfo.tags)) {
        if (vandalTags.includes(tag)) {
          const col = tag.toLowerCase();
          data[msrKey].sensors[sensorLabel] = vandalRow[col] ?? '-';
        } else {
          const col = tag.toLowerCase();
          data[msrKey].sensors[sensorLabel] = analogRow[col] ?? '-';
        }
      }
    }

    // Return the formatted MSR data
    res.json({ data });
  } catch (error) {
    console.error(' Error fetching MSR_ANALOG:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
