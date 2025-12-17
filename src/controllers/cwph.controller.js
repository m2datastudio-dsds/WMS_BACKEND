// src/controllers/cwph.controller.js
import { getPool } from '../middleware/cwph.js';
import { CWPH_DB, TABLES, TAB_KEYS } from '../mapping/cwphMap.js';

// Convert all row keys to UPPERCASE so A1..A16 etc still work
function normalizeRow(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.toUpperCase()] = v;
  }
  return out;
}

async function latest(pool, tableName) {
  const sql = `
    SELECT *
    FROM ${tableName}
    WHERE date1 IS NOT NULL AND time1 IS NOT NULL
    ORDER BY date1 DESC, time1 DESC
    LIMIT 1
  `;
  const { rows } = await pool.query(sql);
  return normalizeRow(rows[0]);
}

async function latestFillPerKey(pool, tableName, keys, lookback = 50) {
 const sql = `
    SELECT *
    FROM ${tableName}
    WHERE date1 IS NOT NULL AND time1 IS NOT NULL
    ORDER BY date1 DESC, time1 DESC
    LIMIT ${lookback}
  `;
  const { rows = [] } = await pool.query(sql);
  const normRows = rows.map(normalizeRow);

  const out = {};
  for (const k of keys) {
    let val = null;
    for (const r of normRows) {
      if (r[k] !== null && r[k] !== undefined) {
        val = r[k];
        break;
      }
    }
    out[k] = val;
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
      TAB_KEYS.TAB2.keys,   // A1..A16
      100                   // look back up to 100 rows (tune as needed)
    );
    const vibRow      = await latest(pool, TABLES.vib);
    const pumpRunRow  = await latest(pool, TABLES.pump_run);
    const noiseRow    = await latest(pool, TABLES.noise);
    const tempRow     = await latest(pool, TABLES.temp);

    const tabs = {
      TAB1: Object.fromEntries(TAB_KEYS.TAB1.keys.map(k => [k, pumpRow?.[k] ?? null])),
      TAB2: analogTab,
      TAB3: Object.fromEntries(TAB_KEYS.TAB3.keys.map(k => [k, valveRow?.[k] ?? null])),
      TAB4: Object.fromEntries(TAB_KEYS.TAB4.keys.map(k => [k, vibRow?.[k] ?? null])),
      TAB5: Object.fromEntries(TAB_KEYS.TAB5.keys.map(k => [k, pumpRunRow?.[k] ?? null])),
      TAB6: Object.fromEntries(TAB_KEYS.TAB6.keys.map(k => [k, noiseRow?.[k] ?? null])),
      TAB7: Object.fromEntries(TAB_KEYS.TAB7.keys.map(k => [k, tempRow?.[k] ?? null])),
    };

    res.json({ ok: true, db: CWPH_DB, at: new Date().toISOString(), tabs });
  } catch (err) {
    console.error('getCwphTabs error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};