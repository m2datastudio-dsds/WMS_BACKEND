import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generateReportPDF = async (data, reportDateFormatted) => {
  // const outputDir = path.resolve('src', 'reports');
  // const filePath = path.join(outputDir, `TL_REPORT_${reportDateFormatted}.pdf`);
  // if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const leftLogo = await pdfDoc.embedPng(fs.readFileSync(path.resolve('src', 'assets', 'TWDA_Logo.png')));
  const rightLogo = await pdfDoc.embedPng(fs.readFileSync(path.resolve('src', 'assets', 'meillogo.png')));

  // Header with logos
  page.drawImage(leftLogo, { x: 40, y: height - 80, width: 50, height: 50 });
  page.drawImage(rightLogo, { x: width - 90, y: height - 70, width: 50, height: 25 });

  const center = (text, size) => (width - bold.widthOfTextAtSize(text, size)) / 2;
  const headerLines = [
    { text: 'WATER SUPPLY IMPROVEMENT SCHEME TO EXPANDED', size: 11 },
    { text: 'COIMBATORE CORPORATION INCLUDING NEWLY MERGED AREAS WITH', size: 10 },
    { text: 'RIVER BHAVANI AS SOURCE PILLUR-3', size: 10 },
    { text: `DAILY REPORT ON DATE: ${reportDateFormatted}`, size: 11, color: rgb(0, 0, 0.8) },
  ];
  headerLines.forEach((line, i) => {
    page.drawText(line.text, {
      x: center(line.text, line.size),
      y: height - 40 - i * 15,
      size: line.size,
      font: bold,
      color: line.color || rgb(0, 0, 0)
    });
  });

  const rowData = data[0] || {};

  // 1️⃣ RAW WATER TRANSMISSION LINE
  drawRedHeading(page, 'RAW WATER TRANSMISSION LINE', 700, bold, width);
  drawStructuredTable(page, [
    { tag: 'A1', label: 'RTL-01', unit: '(mH2O)' },
    { tag: 'A2', label: 'RTL-02', unit: '(mH2O)' },
    { tag: 'A3', label: 'RTL-03', unit: '(mH2O)' },
    { tag: 'A4', label: 'RTL-04', unit: '(mH2O)' },
    { tag: 'A5', label: 'RTL-05', unit: '(mH2O)' },
    { tag: 'A6', label: 'RTL-06', unit: '(mH2O)' },
  ], rowData, 680, font, bold, width);

  // 2️⃣ CLEAR WATER TRANSMISSION LINE
  drawRedHeading(page, 'CLEAR WATER TRANSMISSION LINE', 510, bold, width);
  drawStructuredTable(page, [
    { tag: 'A7', label: 'CTL-01', unit: '(mH2O)' },
    { tag: 'A8', label: 'CTL-02', unit: '(mH2O)' },
    { tag: 'A9', label: 'CTL-03', unit: '(mH2O)' },
    { tag: 'A10', label: 'CTL-04', unit: '(mH2O)' },
    { tag: 'A11', label: 'CTL-05', unit: '(mH2O)' },
    { tag: 'A12', label: 'CTL-06', unit: '(mH2O)' },
  ], rowData, 490, font, bold, width);

  // 3️⃣ FEEDER MAIN I TRANSMISSION LINE
  drawRedHeading(page, 'FEEDER MAIN I TRANSMISSION LINE', 320, bold, width);
  drawStructuredTable(page, Array.from({ length: 12 }, (_, i) => ({
    tag: `A${i + 21}`,
    label: `FMA-${String(i + 1).padStart(2, '0')}`,
    unit: '(mH2O)'
  })), rowData, 300, font, bold, width);

  // 4️⃣ FEEDER MAIN II TRANSMISSION LINE
  drawRedHeading(page, 'FEEDER MAIN II TRANSMISSION LINE', 140, bold, width);
  drawStructuredTable(page, Array.from({ length: 8 }, (_, i) => ({
    tag: `A${i + 13}`,
    label: `FMB-${String(i + 1).padStart(2, '0')}`,
    unit: '(mH2O)'
  })), rowData, 120, font, bold, width);

  // fs.writeFileSync(filePath, await pdfDoc.save());
  // return filePath;
  return await pdfDoc.save();

};

function drawRedHeading(page, title, y, bold, pageWidth) {
  page.drawText(title, {
    x: (pageWidth - bold.widthOfTextAtSize(title, 10)) / 2,
    y,
    size: 10,
    font: bold,
    color: rgb(0.8, 0, 0),
  });
}

function drawStructuredTable(page, tags, rowData, startY, font, bold, pageWidth) {
  const colWidth = 45;
  const rowHeight = 22;
  const totalWidth = colWidth * (tags.length + 1);
  const startX = (pageWidth - totalWidth) / 2;
  const headerColor = rgb(0.392, 0.584, 0.929);

  // Header
  drawCell(page, startX, startY, colWidth, rowHeight, '', bold, headerColor, true);
  tags.forEach((tag, idx) => {
    const label = `${tag.label}\n${tag.unit}`;
    drawCell(page, startX + (idx + 1) * colWidth, startY, colWidth, rowHeight, label, bold, headerColor, true, 5);
  });

  // Rows: MAX, MIN, AVG
  ['MAX', 'MIN', 'AVG'].forEach((metric, rIdx) => {
    const y = startY - (rIdx + 1) * rowHeight;
    drawCell(page, startX, y, colWidth, rowHeight, metric, bold);
    tags.forEach((tag, idx) => {
      let val = '0.00';
      if (metric === 'MAX') val = (rowData[`Max_${tag.tag}`] ?? 0).toFixed(2);
      else if (metric === 'MIN') val = (rowData[`Min_${tag.tag}`] ?? 0).toFixed(2);
      else if (metric === 'AVG') val = (rowData[`Avg_${tag.tag}`] ?? 0).toFixed(2);
      drawCell(page, startX + (idx + 1) * colWidth, y, colWidth, rowHeight, val, font);
    });
  });
}

function drawCell(page, x, y, w, h, text, font, bgColor = rgb(1, 1, 1), isHeader = false, headerFontSize = 6) {
  page.drawRectangle({
    x, y: y - h + 2, width: w, height: h,
    color: bgColor,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });

  const lines = text.split('\n');
  const lineHeight = 8;
  const totalTextHeight = lines.length * lineHeight;
  let textY = y - (h / 2) + (totalTextHeight / 2) - 4;

  lines.forEach(line => {
    const size = isHeader ? headerFontSize : 5;
    const textWidth = font.widthOfTextAtSize(line, size);
    const textX = x + (w - textWidth) / 2;
    page.drawText(line, { x: textX, y: textY, size, font, color: rgb(0, 0, 0) });
    textY -= lineHeight;
  });
}
