import { pool, poolConnect } from '../middleware/db.js';

export const getLatestVandalismData = async (req, res) => {
  const { tag } = req.params;

  // Validate tag (A1–A32)
  if (!/^A([1-9]|[12][0-9]|3[0-2])$/.test(tag)) {
    return res.status(400).json({ error: 'Invalid tag format' });
  }

  const col = tag.toLowerCase(); // a1..a32 etc

  try {
    await poolConnect;

    //  Get latest row with formatted date/time directly from Postgres
    const sql = `
      SELECT
        date1,
        time1,
        ${col} AS value
      FROM vandalism
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
    console.error(' Error fetching vandalism data:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};
