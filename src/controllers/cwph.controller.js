// src/controllers/cwph.controller.js
import { getPool } from '../middleware/cwph.js';
import { CWPH_DB, TABLES, TAB_KEYS } from '../mapping/cwphMap.js';

async function latest(pool, tableName) {
  const q = `
    SELECT TOP (1) *
    FROM ${tableName} WITH (NOLOCK)
    ORDER BY DATE1 DESC, TIME1 DESC
  `;
  const { recordset } = await pool.request().query(q);
  return recordset?.[0] ?? null;
}
async function latestFillPerKey(pool, tableName, keys, lookback = 50) {
  const q = `
    SELECT TOP (${lookback}) *
    FROM ${tableName} WITH (NOLOCK)
    ORDER BY DATE1 DESC, TIME1 DESC
  `;
  const { recordset = [] } = await pool.request().query(q);
  const out = {};
  for (const k of keys) {
    let val = null;
    for (const row of recordset) {
      if (row[k] !== null && row[k] !== undefined) { val = row[k]; break; }
    }
    out[k] = val; // stays null if no non-null found
  }
  return out;
}
export const getCwphRaw = async (req, res) => {
  try {
    const pool = await getPool(CWPH_DB);
    const [pump, valve, analog] = await Promise.all([
      latest(pool, TABLES.pump),
      latest(pool, TABLES.valve),
      latest(pool, TABLES.analog),
    ]);
    res.json({ ok: true, db: CWPH_DB, at: new Date().toISOString(), raw: { pump, valve, analog } });
  } catch (err) {
    console.error('getCwphRaw error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

export const getCwphTabs = async (req, res) => {
  try {
    const pool = await getPool(CWPH_DB);

    // latest rows
    const pumpRow   = await latest(pool, TABLES.pump);
    const valveRow  = await latest(pool, TABLES.valve);

    // TAB2 often has gaps → fill from most recent non-null
    const analogTab = await latestFillPerKey(
      pool,
      TABLES.analog,
      TAB_KEYS.TAB2.keys,   // A1..A34
      100                   // look back up to 100 rows (tune as needed)
    );

    const tabs = {
      TAB1: Object.fromEntries(TAB_KEYS.TAB1.keys.map(k => [k, pumpRow?.[k] ?? null])),
      TAB2: analogTab,
      TAB3: Object.fromEntries(TAB_KEYS.TAB3.keys.map(k => [k, valveRow?.[k] ?? null])),
    };

    res.json({ ok: true, db: CWPH_DB, at: new Date().toISOString(), tabs });
  } catch (err) {
    console.error('getCwphTabs error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};