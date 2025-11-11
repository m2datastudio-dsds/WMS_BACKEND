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
    const tagList = Array.from(allRequiredTags)
    .filter(tag => tag !== "A37" && tag !== "A38")
    .join(', ');

    // Query to get the latest MSR row
    const query = `
      SELECT TOP 1
        CONVERT(VARCHAR(10), DATE1, 120) AS DateFormatted,
        CONVERT(VARCHAR(8), TIME1, 108) AS TimeFormatted,
        ${tagList}
      FROM MSR_ANALOG
      ORDER BY DATE1 DESC, TIME1 DESC
    `;

    // --- Query 2: VANDALISM ---
    const queryVandalism = `
      SELECT TOP 1 A37, A38
      FROM VANDALISM
      ORDER BY DATE1 DESC, TIME1 DESC;
    `;

    // Execute the query
    const [result, vandalResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(queryVandalism)
    ]);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'No MSR data found' });
    }

    const row = result.recordset[0];
    const vandalismData = vandalResult.recordset?.[0] || {};
    const date = row.DateFormatted;
    const time = row.TimeFormatted;

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
        if (tag === "A37" || tag === "A38") {
          data[msrKey].sensors[sensorLabel] = vandalismData[tag] ?? '-';
        } else {
          data[msrKey].sensors[sensorLabel] = row[tag] ?? '-';
        }
      }
    }

    // Return the formatted MSR data
    res.json({ data });
  } catch (error) {
    console.error('❌ Error fetching MSR_ANALOG:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
