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
  noise:    '[dbo].[CWPH_NOISE]',   
  vib:      '[dbo].[CWPH_VIB]', 
  temp:     '[dbo].[CWPH_TEMP]',    
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
    keys: ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13'],
  },
  TAB2: {
    table: 'analog',
    keys: Array.from({ length: 16 }, (_, i) => `A${i + 1}`), // A1..A16
  },
  TAB3: {
    table: 'valve',
    keys: ['A1','A2','A3','A4','A5','A6','A7'],
  },
  TAB4: { table: 'vib',    keys: Array.from({ length: 12 }, (_, i) => `A${i + 1}`) },
  TAB5: { table: 'pump_run', keys: ['VTP_01_HR','VTP_01_MIN','VTP_02_HR','VTP_02_MIN','VTP_03_HR','VTP_03_MIN','VTP_04_HR','VTP_04_MIN','VTP_05_HR','VTP_05_MIN','VTP_06_HR','VTP_06_MIN'] },
  TAB6: { table: 'noise',  keys: Array.from({ length: 6 }, (_, i) => `A${i + 1}`) },
  TAB7: { table: 'temp',   keys: Array.from({ length: 114 }, (_, i) => `A${i + 1}`) },
};
