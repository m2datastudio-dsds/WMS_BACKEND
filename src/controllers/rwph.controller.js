// src/controllers/rwph.controller.js
import { getPool } from '../middleware/rwph.js';
import { RWPH_DB, TABLES, TAB_KEYS } from '../mapping/rwphMap.js';

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

export const getRwphRaw = async (req, res) => {
  try {
    const pool = await getPool(RWPH_DB);
    const [pump, valve, analog] = await Promise.all([
      latest(pool, TABLES.pump),
      latest(pool, TABLES.valve),
      latest(pool, TABLES.analog),
    ]);
    res.json({ ok: true, db: RWPH_DB, at: new Date().toISOString(), raw: { pump, valve, analog } });
  } catch (err) {
    console.error('getRwphRaw error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

export const getRwphTabs = async (req, res) => {
  try {
    const pool = await getPool(RWPH_DB);
    const rows = {
      pump:   await latest(pool, TABLES.pump),
      valve:  await latest(pool, TABLES.valve),
      analog: await latest(pool, TABLES.analog),
      noise:   await latest(pool, TABLES.noise),
      vib:     await latest(pool, TABLES.vib),
      pumpRun: await latest(pool, TABLES.pumpRun),
      temp:    await latest(pool, TABLES.temp),
    };

    const tabs = {};
    for (const [tab, { table, keys }] of Object.entries(TAB_KEYS)) {
      const row = rows[table] || {};
      const out = {};

      // for (const k of keys) out[k] = row[k] ?? null; // passthrough A-keys
      
      // For normal A1..An style tables:
      if (!table.includes('pumpRun')) {
        for (const k of keys) out[k] = row[k] ?? null;
      } else {
        // For RWPH_PUMP_RUN table (columns like VTP_01_HR, etc.)
        for (const k of keys) out[k] = row[k] ?? null;
      }

      tabs[tab] = out;
    }

    res.json({ ok: true, db: RWPH_DB, at: new Date().toISOString(), tabs });
  } catch (err) {
    console.error('getRwphTabs error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
};
