import { pool, poolConnect } from '../middleware/db.js';

export const getLatestVandalismData = async (req, res) => {
  const { tag } = req.params;

  // Validate tag (A1–A32)
  if (!/^A([1-9]|[12][0-9]|3[0-2])$/.test(tag)) {
    return res.status(400).json({ error: 'Invalid tag format' });
  }

  try {
    await poolConnect;

    //  Get latest row with formatted date/time directly from SQL
    const query = `
      SELECT TOP 1 
        CONVERT(VARCHAR(10), DATE1, 120) AS DateFormatted,
        CONVERT(VARCHAR(8), TIME1, 108) AS TimeFormatted,
        ${tag}
      FROM VANDALISM
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
    console.error('❌ Error fetching vandalism data:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};
