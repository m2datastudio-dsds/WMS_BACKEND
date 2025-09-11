import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generateMSTMSRMBRReport = async (data, reportDateFormatted) => {
  // const outputDir = path.resolve('src', 'reports');
  // const filePath = path.join(outputDir, `MST_MSR_MBR_Report_${reportDateFormatted}.pdf`);
  // if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const leftLogo = await pdfDoc.embedPng(fs.readFileSync(path.resolve('src', 'assets', 'TWDA_Logo.png')));
  const rightLogo = await pdfDoc.embedPng(fs.readFileSync(path.resolve('src', 'assets', 'meillogo.png')));

  const addHeader = (page) => {
    const { width, height } = page.getSize();
    const center = (text, size) => (width - bold.widthOfTextAtSize(text, size)) / 2;
    page.drawImage(leftLogo, { x: 40, y: height - 80, width: 50, height: 50 });
    page.drawImage(rightLogo, { x: width - 90, y: height - 70, width: 50, height: 25 });
    const lines = [
      { text: 'WATER SUPPLY IMPROVEMENT SCHEME TO EXPANDED', size: 11 },
      { text: 'COIMBATORE CORPORATION INCLUDING NEWLY MERGED AREAS WITH', size: 10 },
      { text: 'RIVER BHAVANI AS SOURCE PILLUR-3', size: 10 },
      { text: `DAILY REPORT ON DATE: ${reportDateFormatted}`, size: 11, color: rgb(0, 0, 0.8) },
    ];
    lines.forEach((line, i) => {
      page.drawText(line.text, {
        x: center(line.text, line.size),
        y: height - 40 - i * 15,
        size: line.size,
        font: bold,
        color: line.color || rgb(0, 0, 0),
      });
    });
  };

  const drawRedTitle = (page, title, y) => {
    const pageWidth = page.getWidth();
    page.drawText(title, {
      x: (pageWidth - bold.widthOfTextAtSize(title, 10)) / 2,
      y,
      size: 10,
      font: bold,
      color: rgb(0.8, 0, 0),
    });
  };

  const drawOneLineTable = (page, cells, y) => {
    const pageWidth = page.getWidth();
    const tableWidth = 270;
    const cellWidth = tableWidth / cells.length;
    const startX = (pageWidth - tableWidth) / 2;
    const headerColor = rgb(0.392, 0.584, 0.929);
    cells.forEach((text, idx) => {
      drawCell(page, startX + idx * cellWidth, y, cellWidth, 20, text, bold, headerColor, true, 6.5);
    });
  };

  const drawFlowTotalizerTable = (page, title, rows, data, y) => {
    const pageWidth = page.getWidth();
    const colWidth = 85, rowHeight = 22;
    const tableWidth = colWidth * 4;
    const x = (pageWidth - tableWidth) / 2;
    const headerColor = rgb(0.392, 0.584, 0.929);
    page.drawText(title, {
      x: (pageWidth - bold.widthOfTextAtSize(title, 9)) / 2,
      y: y + 15,
      size: 9,
      font: bold,
      color: rgb(0.8, 0, 0),
    });
    ['TOTALIZER', 'INITIAL FLOW\n(m3)', 'FINAL FLOW\n(m3)', 'CUM FLOW\n(m3)'].forEach((h, i) => {
      drawCell(page, x + i * colWidth, y, colWidth, rowHeight, h, bold, headerColor, true, 5.5);
    });
    rows.forEach((row, idx) => {
      const rowY = y - rowHeight * (idx + 1);
      const min = parseFloat((data[`Min_${row.tag}`] ?? 0).toFixed(2));
      const max = parseFloat((data[`Max_${row.tag}`] ?? 0).toFixed(2));
      const cum = parseFloat((max - min).toFixed(2));
      drawCell(page, x, rowY, colWidth, rowHeight, row.title, bold);
      [min, max, cum].forEach((v, i) => {
        drawCell(page, x + (i + 1) * colWidth, rowY, colWidth, rowHeight, v.toFixed(2), font);
      });
    });
  };

  const drawFullTable = (page, title, tags, rowData, yStart) => {
    const width = page.getWidth() - 40;
    const colWidth = Math.min(45, (width - 40) / (tags.length + 1));
    const rowHeight = 22;
    const startX = 20 + (width - (colWidth * (tags.length + 1))) / 2;
    const headerColor = rgb(0.392, 0.584, 0.929);
    if (title) {
      page.drawText(title, {
        x: startX + ((colWidth * (tags.length + 1)) - bold.widthOfTextAtSize(title, 10)) / 2,
        y: yStart + 14,
        size: 10,
        font: bold,
        color: rgb(0.8, 0, 0),
      });
    }
    drawCell(page, startX, yStart, colWidth, rowHeight, '', bold, headerColor, true, 5.5);
    tags.forEach((tag, i) => {
      drawCell(page, startX + colWidth * (i + 1), yStart, colWidth, rowHeight, `${tag.label}\n${tag.unit}`, bold, headerColor, true, 5);
    });
    ['MAX', 'MIN', 'AVG'].forEach((type, rowIdx) => {
      const y = yStart - rowHeight * (rowIdx + 1);
      drawCell(page, startX, y, colWidth, rowHeight, type, bold);
      tags.forEach((tag, i) => {
        const val = (rowData[`${type === 'MAX' ? 'Max' : type === 'MIN' ? 'Min' : 'Avg'}_${tag.tag}`] ?? 0).toFixed(2);
        drawCell(page, startX + colWidth * (i + 1), y, colWidth, rowHeight, val, font);
      });
    });
  };

  const drawCell = (page, x, y, w, h, text, font, bgColor = rgb(1, 1, 1), isHeader = false, headerFontSize = 5) => {
    page.drawRectangle({ x, y: y - h + 2, width: w, height: h, color: bgColor, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    const lines = text.split('\n'), lineHeight = 7;
    let textY = y - h / 2 + (lines.length * lineHeight) / 2 - 3;
    lines.forEach(line => {
      const size = isHeader ? headerFontSize : 5;
      const textX = x + (w - font.widthOfTextAtSize(line, size)) / 2;
      page.drawText(line, { x: textX, y: textY, size, font, color: rgb(0, 0, 0) });
      textY -= lineHeight;
    });
  };

  // === PAGE 1: MST ===
  const page1 = pdfDoc.addPage([595, 842]);
  addHeader(page1);
  drawRedTitle(page1, 'MASTER STORAGE TANK (PANNIMADAI) – 2 NOs', 700);
  drawOneLineTable(page1, ['CAP: 73 LL (Each)', 'TFL: 512.35m', 'MWL: 516.00m'], 680);
  drawFullTable(page1, '', [
    { tag: 'A1', label: 'LEVEL\nTRANSMITTER 01', unit: '(M)' },
    { tag: 'A2', label: 'LEVEL\nTRANSMITTER 02', unit: '(M)' },
    { tag: 'A3', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A5', label: 'FLOW \nTRANSMITTER 01', unit: '(m3/HR) – FM1' },
    { tag: 'A6', label: 'FLOW \nTRANSMITTER 02', unit: '(m3/HR) – FM2' }
  ], data.mst, 640);
  drawFullTable(page1, 'MASTER STORAGE TANK - WATER QUALITY ANALYZER', [
    { tag: 'A9', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A10', label: 'CONDUCTIVITY', unit: '(uS/m)' },
    { tag: 'A11', label: 'Ph', unit: '' },
    { tag: 'A12', label: 'ORP', unit: '(mv)' }
  ], data.mst, 460);
  drawFlowTotalizerTable(page1, 'MASTER STORAGE TANK - FLOW TOTALIZERS', [
    { title: 'FEEDER MAIN - I\nFLOW TOTALIZER', tag: 'A7' },
    { title: 'FEEDER MAIN - II\nFLOW TOTALIZER', tag: 'A8' }
  ], data.mst, 280);

  // === PAGE 2: MBR (PRESS ENCLAVE & PILLAYARPURAM) ===
  const page2 = pdfDoc.addPage([595, 842]);
  addHeader(page2);
  drawRedTitle(page2, 'MBR (PRESS ENCLAVE)', 720);
  drawOneLineTable(page2, ['CAP: 15 LL', 'GL: 433.21m', 'MWL: 453.21m'], 700);
  drawFullTable(page2, '', [
    { tag: 'A3', label: 'LEVEL\nTRANSMITTER', unit: '(M)' },
    { tag: 'A7', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A11', label: 'FLOW\nTRANSMITTER', unit: '(m3/HR)' },
    { tag: 'A19', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A23', label: 'CONDUCTIVITY', unit: '(uS/m)' },
  ], data.mbr, 660);
  drawFlowTotalizerTable(page2, 'MBR (PRESS ENCLAVE) - FLOW TOTALIZER', [
    { title: 'OUTLET FLOW TOTALIZER', tag: 'A15' }
  ], data.mbr, 500);
  drawRedTitle(page2, 'MBR (PILLAYARPURAM)', 400);
  drawOneLineTable(page2, ['CAP: 20 LL', 'GL: 455.79m', 'MWL: 475.79m'], 380);
  drawFullTable(page2, '', [
    { tag: 'A4', label: 'LEVEL\nTRANSMITTER', unit: '(M)' },
    { tag: 'A8', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A12', label: 'FLOW\nTRANSMITTER', unit: '(m3/HR)' },
    { tag: 'A20', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A24', label: 'CONDUCTIVITY', unit: '(uS/m)' },
  ], data.mbr, 340);
  drawFlowTotalizerTable(page2, 'MBR (PILLAYARPURAM) - FLOW TOTALIZER', [
    { title: 'OUTLET FLOW TOTALIZER', tag: 'A16' }
  ], data.mbr, 180);

  // === PAGE 3: MBR (VALARMATHI NAGAR & BHARATHI PARK) ===
  const page3 = pdfDoc.addPage([595, 842]);
  addHeader(page3);
  drawRedTitle(page3, 'MBR (VALARMATHI NAGAR)', 720);
  drawOneLineTable(page3, ['CAP: 20 LL', 'GL: 461.95m', 'MWL: 481.95m'], 700);
  drawFullTable(page3, '', [
    { tag: 'A1', label: 'LEVEL\nTRANSMITTER', unit: '(M)' },
    { tag: 'A5', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A9', label: 'FLOW\nTRANSMITTER', unit: '(m3/HR)' },
    { tag: 'A17', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A21', label: 'CONDUCTIVITY', unit: '(uS/m)' },
  ], data.mbr, 660);
  drawFlowTotalizerTable(page3, 'MBR (VALARMATHI NAGAR) - FLOW TOTALIZER', [
    { title: 'FLOW TOTALIZER', tag: 'A13' }
  ], data.mbr, 500);
  drawRedTitle(page3, 'MBR (BHARATHI PARK)', 400);
  drawOneLineTable(page3, ['CAP: 38.87 LL', 'GL: 442.00m', 'MWL: 458.00m'], 380);
  drawFullTable(page3, '', [
    { tag: 'A2', label: 'LEVEL\nTRANSMITTER', unit: '(M)' },
    { tag: 'A6', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A10', label: 'FLOW\nTRANSMITTER', unit: '(m3/HR)' },
    { tag: 'A18', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A22', label: 'CONDUCTIVITY', unit: '(uS/m)' },
  ], data.mbr, 340);
  drawFlowTotalizerTable(page3, 'MBR (BHARATHI PARK) - FLOW TOTALIZER', [
    { title: 'FLOW TOTALIZER', tag: 'A14' }
  ], data.mbr, 180);

  // === PAGE 4: MSR (RAMAKRISHNAPURAM OLD & NEW) ===
  const page4 = pdfDoc.addPage([595, 842]);
  addHeader(page4);
  drawRedTitle(page4, 'MSR (RAMAKRISHNAPURAM OLD)', 720);
  drawOneLineTable(page4, ['CAP: 30 LL', 'GL: 425.82m', 'MWL: 448.37m'], 700);
  drawFullTable(page4, '', [
    { tag: 'A1', label: 'LEVEL\nTRANSMITTER', unit: '(M)' },
    { tag: 'A2', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A5', label: 'FLOW\nTRANSMITTER', unit: '(m3/HR)' },
    { tag: 'A3', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A4', label: 'CONDUCTIVITY', unit: '(uS/m)' },
  ], data.msr, 660);
  drawFlowTotalizerTable(page4, 'MSR (RAMAKRISHNAPURAM OLD) - FLOW TOTALIZER', [
    { title: 'OUTLET FLOW TOTALIZER', tag: 'A6' }
  ], data.msr, 500);
  drawRedTitle(page4, 'MSR (RAMAKRISHNAPURAM NEW)', 400);
  drawOneLineTable(page4, ['CAP: 30 LL', 'GL: 429.50m', 'MWL: 452.05m'], 380);
  drawFullTable(page4, '', [
    { tag: 'A7', label: 'LEVEL\nTRANSMITTER', unit: '(M)' },
    { tag: 'A8', label: 'PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
    { tag: 'A11', label: 'FLOW\nTRANSMITTER', unit: '(m3/HR)' },
    { tag: 'A9', label: 'CHLORINE', unit: '(mg/L)' },
    { tag: 'A10', label: 'CONDUCTIVITY', unit: '(uS/m)' },
  ], data.msr, 340);
  drawFlowTotalizerTable(page4, 'MSR (RAMAKRISHNAPURAM NEW) - FLOW TOTALIZER', [
    { title: 'OUTLET FLOW TOTALIZER', tag: 'A12' }
  ], data.msr, 180);

  // fs.writeFileSync(filePath, await pdfDoc.save());
  // return filePath;
  return await pdfDoc.save();

};
