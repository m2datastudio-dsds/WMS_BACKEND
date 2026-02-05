// src/utils/generateCombinedWaterReport.js

import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { generateRWPHCWPHReport } from './generateRWPHCWPHReport.js';
import { generateMSTMSRMBRReport } from './generateMSTMSRMBRReport.js';
import { generateReportPDF } from './pdfGenerator.js';

/**
 * Generates a combined 7-page water report in the client's requested order.
 *
 * @param {Object} rwphcwphData - RWPH/CWPH data
 * @param {Object} mstmsrmbrData - MST/MSR/MBR data
 * @param {Object} transmissionData - Transmission Line data
 * @param {string} reportDateFormatted - Formatted report date
 * @returns {Promise<string>} - Path to the generated combined PDF
 */
export const generateCombinedWaterReport = async (
  rwphcwphData,
  mstmsrmbrData,
  transmissionData,
  reportDateFormatted,
  reportPeriodText = ''
) => {
  const outputDir = path.resolve('src', 'reports');
  const filePath = path.join(outputDir, `Combined_Water_Report_${reportDateFormatted}.pdf`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const combinedPdf = await PDFDocument.create();

  // 1️⃣ + 2️⃣ RWPH/CWPH: Pages 1 & 2
  const rwphcwphPdfBytes = await generateRWPHCWPHReport(rwphcwphData, reportDateFormatted, reportPeriodText);
  const rwphcwphPdf = await PDFDocument.load(rwphcwphPdfBytes);
  const rwphcwphPages = await combinedPdf.copyPages(rwphcwphPdf, rwphcwphPdf.getPageIndices());
  rwphcwphPages.forEach(page => combinedPdf.addPage(page));

  // 3️⃣ + 5️⃣ + 6️⃣ + 7️⃣ MST/MSR/MBR: Pages 3, 5, 6, 7
  const mstmsrmbrPdfBytes = await generateMSTMSRMBRReport(mstmsrmbrData, reportDateFormatted, reportPeriodText);
  const mstmsrmbrPdf = await PDFDocument.load(mstmsrmbrPdfBytes);
  const mstmsrmbrPages = await combinedPdf.copyPages(mstmsrmbrPdf, mstmsrmbrPdf.getPageIndices());
  mstmsrmbrPages.forEach(page => combinedPdf.addPage(page));

  // 4️⃣ Transmission Line: Page 4
  const transmissionPdfBytes = await generateReportPDF(transmissionData, reportDateFormatted, reportPeriodText);
  const transmissionPdf = await PDFDocument.load(transmissionPdfBytes);
  const transmissionPages = await combinedPdf.copyPages(transmissionPdf, transmissionPdf.getPageIndices());
  // Insert the Transmission Line page as Page 4
  combinedPdf.insertPage(3, transmissionPages[0]);

  // Save the combined PDF
  const pdfBytes = await combinedPdf.save();
  fs.writeFileSync(filePath, pdfBytes);

  console.log(`✅ Combined 7-page report generated: ${filePath}`);
  return filePath;
};
