// src/mapping/cwphMap.js

export const CWPH_DB = process.env.CWPH_DB_DATABASE || 'CWPH';

export const TABLES = {
  pump:     '[dbo].[CWPH_PUMP]',
  valve:    '[dbo].[CWPH_VALVE]',
  analog:   '[dbo].[CWPH_ANALOG]',
  // (available if you need later)
  mfm1:     '[dbo].[CWPH_MFM1]',
  mfm2:     '[dbo].[CWPH_MFM2]',
  pump_run: '[dbo].[CWPH_PUMP_RUN]',
  run_hr:   '[dbo].[CWPH_RUN_HR]',
};

/**
 * Keep the same TAB model you used for RWPH:
 *  TAB1 → pump ON/OFF & valve open/close bits (from CWPH_PUMP)
 *  TAB2 → analog/flow/quality values (from CWPH_ANALOG)
 *  TAB3 → valve positions % (from CWPH_VALVE)
 * Include A7/A8 so CLW PUMP 1/2 are available.
 */
export const TAB_KEYS = {
  TAB1: {
    table: 'pump',
    keys: ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'],
  },
  TAB2: {
    table: 'analog',
    keys: Array.from({ length: 34 }, (_, i) => `A${i + 1}`), // A1..A34
  },
  TAB3: {
    table: 'valve',
    keys: ['A1','A2','A3','A4','A5','A6','A7'],
  },
};
