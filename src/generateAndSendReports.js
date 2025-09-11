// src/generateAndSendReports.js

import { getTransmissionLineData } from './services/report.service.js';
import { getMSTMSRMBRData } from './services/getMSTMSRMBRData.js';
import { getRWPHCWPHData } from './services/getRWPHCWPHData.js';
import { generateCombinedWaterReport } from './utils/generateCombinedWaterReport.js';
import sendEmail from './utils/sendEmail.js';

// export async function generateAndSendReports() {
//   try {
//     console.log('📌 Starting combined report generation...');

//     const [transmissionResult, mstmsrmbrResult, rwphcwphResult] = await Promise.all([
//       getTransmissionLineData(),
//       getMSTMSRMBRData(),
//       getRWPHCWPHData()
//     ]);

//     const reportDateFormatted =
//       transmissionResult?.reportDateFormatted ||
//       mstmsrmbrResult?.reportDateFormatted ||
//       rwphcwphResult?.reportDateFormatted;

//     if (!transmissionResult?.data?.length && !mstmsrmbrResult?.data && !rwphcwphResult?.data) {
//       console.log('⚠️ No data found for any report. Skipping email.');
//       return;
//     }

//     const combinedPdfPath = await generateCombinedWaterReport(
//       rwphcwphResult?.data || {},
//       mstmsrmbrResult?.data || {},
//       transmissionResult?.data || [],
//       reportDateFormatted
//     );

//     await sendEmail([combinedPdfPath], reportDateFormatted);
//     console.log('✅ Combined report emailed successfully.');
//   } catch (error) {
//     console.error('❌ Error generating or sending combined report:', error);
//     throw error;
//   }
// }
export async function generateAndSendReports() {
  try {
    console.log('📌 Starting combined report generation...');

    const [transmissionResult, mstmsrmbrResult, rwphcwphResult] = await Promise.all([
      getTransmissionLineData(),
      getMSTMSRMBRData(),
      getRWPHCWPHData()
    ]);

    const reportDateFormatted =
      transmissionResult?.reportDateFormatted ||
      mstmsrmbrResult?.reportDateFormatted ||
      rwphcwphResult?.reportDateFormatted;

    if (
      !transmissionResult?.data?.length &&
      !mstmsrmbrResult?.data &&
      !rwphcwphResult?.data
    ) {
      console.log('⚠️ No data found for any report. Skipping email.');
      return { skipped: true };
    }

    const combinedPdfPath = await generateCombinedWaterReport(
      rwphcwphResult?.data || {},
      mstmsrmbrResult?.data || {},
      transmissionResult?.data || [],
      reportDateFormatted
    );

    await sendEmail([combinedPdfPath], reportDateFormatted);
    console.log('✅ Combined report emailed successfully.');

    return {
      skipped: false,
      reportDate: reportDateFormatted,
      rwphcwph: rwphcwphResult?.data || {},
      mstmsrmbr: mstmsrmbrResult?.data || {},
      transmission: transmissionResult?.data || []
    };

  } catch (error) {
    console.error('❌ Error generating or sending combined report:', error);
    throw error;
  }
}
