// src/mappings/rwphMap.js

/** Which DB to read for RWPH */
export const RWPH_DB = process.env.RWPH_DB_DATABASE || 'RWPH';

/** Tables */
export const TABLES = {
  pump:   '[dbo].[RWPH_PUMP]',
  valve:  '[dbo].[RWPH_VALVE]',
  analog: '[dbo].[RWPH_ANALOG]', // pH, Conductivity, ORP, PT, FT, LT, etc.
  // If you really store FT in RWPH_MFM1/RWPH_MFM2, add them and map below.
  // mfm1:   '[dbo].[RWPH_MFM1]',
  // mfm2:   '[dbo].[RWPH_MFM2]',
  noise:  '[dbo].[RWPH_NOISE]',   
  vib:    '[dbo].[RWPH_VIB]',     
  pumpRun:'[dbo].[RWPH_PUMP_RUN]',
  temp:   '[dbo].[RWPH_TEMP]',    
};

/**
 * Mapping to build your three tabs.
 * LEFT = your TAB key (A1..A15), RIGHT = column name in the table row.
 * Update the column names to your real columns.
 * 
 * 
 */

export const TAB_KEYS = {
  TAB1: { table: 'pump',   keys: ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'] },
  TAB2: { table: 'analog', keys: Array.from({ length: 36 }, (_, i) => `A${i+1}`) }, // A1..A34
  TAB3: { table: 'valve',  keys: ['A1','A2','A3','A4','A5','A6','A7'] },
  TAB4: { table: 'noise',  keys: Array.from({ length: 6 }, (_, i) => `A${i + 1}`) },
  TAB5: { table: 'vib',    keys: Array.from({ length: 12 }, (_, i) => `A${i + 1}`) },
  TAB6: { table: 'pumpRun', keys: ['VTP_01_HR','VTP_01_MIN','VTP_02_HR','VTP_02_MIN','VTP_03_HR','VTP_03_MIN','VTP_04_HR','VTP_04_MIN','VTP_05_HR','VTP_05_MIN','VTP_06_HR','VTP_06_MIN','CWP_01_HR','CWP_01_MIN','CWP_02_HR','CWP_02_MIN'] },
  TAB7: { table: 'temp',   keys: Array.from({ length: 114 }, (_, i) => `A${i + 1}`) },
};


export const TAB_MAP = {
  // TAB1 (from RWPH_PUMP)
  TAB1: {
    table: 'pump',
    fields: {
      A1:  'PUMP1',  // ON/OFF
      A2:  'PUMP2',
      A3:  'PUMP3',
      A4:  'PUMP4',
      A5:  'PUMP5',
      A6:  'PUMP6',
      A7:  'VALVE1', // OPEN/CLOSE (if stored in pump table; else move to valve)
      A8:  'VALVE2',
      A9:  'VALVE3',
      A10: 'VALVE4',
      A11: 'VALVE5',
      A12: 'VALVE6',
      A13: 'VALVE7', // CH valve (EOPD_CHVLV1) if present
    },
  },

  // TAB2 (from RWPH_ANALOG)
  TAB2: {
    table: 'analog',
    fields: {
      // Level
      A1:  'LT1_M',                 // LT 1 (m)
      // PT1..PT7  (mH2O)
      A2:  'PT1_mH2O',
      A3:  'PT2_mH2O',
      A4:  'PT3_mH2O',
      A5:  'PT4_mH2O',
      A6:  'PT5_mH2O',
      A7:  'PT6_mH2O',
      A8:  'PT7_mH2O',
      // Flow
      A9:  'FT1_m3_hr',            // FT 1 (flow rate)
      A10: 'FIQ1_m3',              // FIQ 1 (totalizer)
      // Water quality
      A11: 'PH',                   // pH
      A12: 'CONDUCTIVITY_uS_m',    // Conductivity
      A13: 'ORP_mV',               // ORP
      A14: 'FREE_CL_mg_L',         // Free chlorine
      A15: 'TOTAL_CL_mg_L',        // Total chlorine
    },
  },

  // TAB3 (from RWPH_VALVE) – valve positions %
  TAB3: {
    table: 'valve',
    fields: {
      A1: 'VALVE_POS_1_pct',
      A2: 'VALVE_POS_2_pct',
      A3: 'VALVE_POS_3_pct',
      A4: 'VALVE_POS_4_pct',
      A5: 'VALVE_POS_5_pct',
      A6: 'VALVE_POS_6_pct',
      A7: 'VALVE_POS_7_pct', // MBFV7 etc, if present
    },
  },
};
