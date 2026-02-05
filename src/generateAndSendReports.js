// src/generateAndSendReports.js

import { getTransmissionLineData } from './services/report.service.js';
import { getMSTMSRMBRData } from './services/getMSTMSRMBRData.js';
import { getRWPHCWPHData } from './services/getRWPHCWPHData.js';
import { generateCombinedWaterReport } from './utils/generateCombinedWaterReport.js';
import sendEmail from './utils/sendEmail.js';

const getReportWindowIST = () => {
  // "now" in IST
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  // End boundary: today 06:00 IST (at run time it will be ~06:00)
  const end = new Date(istNow);
  end.setHours(6, 0, 0, 0);

  // Start boundary: yesterday 06:00 IST
  const start = new Date(end);
  start.setDate(start.getDate() - 1);

  return { start, end };
};

// format as "YYYY-MM-DD HH:mm:ss"
const toPgTimestamp = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatPeriodText = (start, end) => {
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) =>
    `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return `${fmt(start)} to ${fmt(end)} IST`;
};

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

    const { start, end } = getReportWindowIST();
    const fromTs = toPgTimestamp(start);
    const toTs = toPgTimestamp(end);

    const reportPeriodText = formatPeriodText(start, end);

    const [transmissionResult, mstmsrmbrResult, rwphcwphResult] = await Promise.all([
      getTransmissionLineData({ fromTs, toTs }),
      getMSTMSRMBRData({ fromTs, toTs }),
      getRWPHCWPHData({ fromTs, toTs })
    ]);

    const reportDateFormatted =
      transmissionResult?.reportDateFormatted ||
      mstmsrmbrResult?.reportDateFormatted ||
      rwphcwphResult?.reportDateFormatted;


      console.log("transmission rows:", transmissionResult?.data?.length || 0);
      console.log("mstmsrmbr has data obj:", !!mstmsrmbrResult?.data);
      console.log("rwphcwph has data obj:", !!rwphcwphResult?.data);


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
      reportDateFormatted,
      reportPeriodText 
    );

    await sendEmail([combinedPdfPath], reportDateFormatted, reportPeriodText);
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
