import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generateRWPHCWPHReport = async (data, reportDateFormatted, reportPeriodText = '') => {
    // const outputDir = path.resolve('src', 'reports');
    // const filePath = path.join(outputDir, `RWPH_CWPH_Report_${reportDateFormatted}.pdf`);
    // if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const leftLogo = await pdfDoc.embedPng(fs.readFileSync(path.resolve('src', 'assets', 'TWDA_Logo.png')));
    const rightLogo = await pdfDoc.embedPng(fs.readFileSync(path.resolve('src', 'assets', 'meillogo.png')));

    const addHeader = (page, title) => {
        const { width, height } = page.getSize();
        const center = (text, size) => (width - bold.widthOfTextAtSize(text, size)) / 2;
        page.drawImage(leftLogo, { x: 40, y: height - 80, width: 50, height: 50 });
        page.drawImage(rightLogo, { x: width - 90, y: height - 70, width: 50, height: 25 });

        const lines = [
            { text: 'WATER SUPPLY IMPROVEMENT SCHEME TO EXPANDED', size: 11 },
            { text: 'COIMBATORE CORPORATION INCLUDING NEWLY MERGED AREAS WITH', size: 10 },
            { text: 'RIVER BHAVANI AS SOURCE PILLUR-3', size: 10 },
            { text: `DAILY REPORT ON DATE: ${reportDateFormatted}`, size: 11, color: rgb(0, 0, 0.8) },
            ...(reportPeriodText ? [{ text: `REPORT PERIOD: ${reportPeriodText}`, size: 10, color: rgb(0.8, 0, 0) }] : [])
        ];

        lines.forEach((line, i) => {
            page.drawText(line.text, {
                x: center(line.text, line.size),
                y: height - 40 - i * 14,
                size: line.size,
                font: bold,
                color: line.color || rgb(0, 0, 0)
            });
        });

        const titleSize = 12;
        const spacingAfterLines = reportPeriodText ? 28 : 40; // Increase this to move further down
        const titleY = height - 40 - lines.length * 14 - spacingAfterLines;
        page.drawText(title, {
            x: center(title, titleSize),
            y: titleY,
            size: titleSize,
            font: bold,
            color: rgb(0.8, 0, 0) // Red color
        });
    };

    // ------------------- PAGE 1 --------------------
    const page1 = pdfDoc.addPage([595, 842]);
    addHeader(page1, 'RAW WATER PUMP HOUSE');

    // Draw joined first table centered like third table, with no gaps
    const firstTableY = 680; // Adjust vertical position
    const tableWidth = 270;  // Same as third table width
    const cellHeight = 20;   // Compact
    const cellWidth = tableWidth / 2;
    const startX = (595 - tableWidth) / 2;
    const headerColor = rgb(0.392, 0.584, 0.929); // Blue

    // Draw first cell (GL)
    drawCell(page1, startX, firstTableY, cellWidth, cellHeight, 'GL: 311.20m', bold, headerColor, true, 7);

    // Draw second cell (VTP SETS)
    drawCell(page1, startX + cellWidth, firstTableY, cellWidth, cellHeight, 'VTP SETS :32300 lpm x 121 m (4+2)', bold, headerColor, true, 7);

    // ------------------- Second Table --------------------
    const rwphTags = [
        { tag: 'A1', label: 'LEVEL\nTRANSMITTER 01', unit: '(m)' },
        { tag: 'A2', label: 'LEVEL\nTRANSMITTER 02', unit: '(m)' },
        { tag: 'A3', label: 'PRESSURE\nTRANSMITTER 01', unit: '(mH2O)' },
        { tag: 'A4', label: 'PRESSURE\nTRANSMITTER 02', unit: '(mH2O)' },
        { tag: 'A5', label: 'PRESSURE\nTRANSMITTER 03', unit: '(mH2O)' },
        { tag: 'A6', label: 'PRESSURE\nTRANSMITTER 04', unit: '(mH2O)' },
        { tag: 'A7', label: 'PRESSURE\nTRANSMITTER 05', unit: '(mH2O)' },
        { tag: 'A8', label: 'PRESSURE\nTRANSMITTER 06', unit: '(mH2O)' },
        { tag: 'A15', label: 'OUTLET PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
        { tag: 'A16', label: 'OUTLET FLOW\nTRANSMITTER ', unit: '(m3/hr)' },
    ];
    drawFullTable(page1, '', rwphTags, data.rwph, 640, font, bold);

    // Third Table - Water Quality Analyzer (RWPH)
    const rwphQualityTags = [
        { tag: 'A30', label: 'pH', unit: '' },
        { tag: 'A31', label: 'CONDUCTIVITY', unit: '(µS/m)' },
        { tag: 'A32', label: 'ORP', unit: '(mV)' },
        { tag: 'A33', label: 'FREE\nCHLORINE', unit: '(mg/L)' },
        { tag: 'A34', label: 'TOTAL\nCHLORINE', unit: '(mg/L)' },
    ];
    drawFullTable(page1, 'RAW WATER PUMP HOUSE - WATER QUALITY ANALYZER', rwphQualityTags, data.rwph, 480, font, bold);

    // Fourth Table - Flow Totalizers (RWPH)
    const rwphFlowTags = [
        { tag: 'A23', label: 'OUTLET FLOW TOTALIZER', unit: '' },
    ];
    // Center the table horizontally
    const flowTableWidth = 85 * 4;
    const tableCenterX = (595 - flowTableWidth) / 2;

    // Keep your original title X position to preserve its placement
    const titleFixedX = 170; // Adjust this if your original placement differs

    drawFlowTable(
        page1,
        'RAW WATER PUMP HOUSE - FLOW TOTALIZERS',
        rwphFlowTags[0].tag,
        data.rwph,
        tableCenterX,    // center the table
        320,
        font,
        bold,
        titleFixedX      // keep heading in previous position
    );
    // Fifth Table - Pump Run Hours (RWPH)
    drawRunHourTable(page1, 'RAW WATER PUMP HOUSE - PUMP RUN HOURS', data.rwphRunHr || [], 200, font, bold, 30);

    // ------------------- PAGE 2 --------------------
    const page2 = pdfDoc.addPage([595, 842]);
    addHeader(page2, 'CLEAR WATER PUMP HOUSE');

    // First Table - GL and VTP SETS, centered horizontally
    const cwphFirstTableY = 680;
    const cwphTableWidth = 270;
    const cwphCellHeight = 20;
    const cwphCellWidth = cwphTableWidth / 2;
    const cwphStartX = (595 - cwphTableWidth) / 2;

    drawCell(page2, cwphStartX, cwphFirstTableY, cwphCellWidth, cwphCellHeight, 'GL: 407.50m', bold, headerColor, true, 7);
    drawCell(page2, cwphStartX + cwphCellWidth, cwphFirstTableY, cwphCellWidth, cwphCellHeight, 'VTP SETS :31360 lpm x 129 m (4+2)', bold, headerColor, true, 7);

    // Second Table - CWPH Level and Pressure Transmitter Tags
    const cwphTags = [
        { tag: 'A1', label: 'LEVEL\nTRANSMITTER', unit: '(m)' },
        { tag: 'A2', label: 'PRESSURE\nTRANSMITTER 01', unit: '(mH2O)' },
        { tag: 'A3', label: 'PRESSURE\nTRANSMITTER 02', unit: '(mH2O)' },
        { tag: 'A4', label: 'PRESSURE\nTRANSMITTER 03', unit: '(mH2O)' },
        { tag: 'A5', label: 'PRESSURE\nTRANSMITTER 04', unit: '(mH2O)' },
        { tag: 'A6', label: 'PRESSURE\nTRANSMITTER 05', unit: '(mH2O)' },
        { tag: 'A7', label: 'PRESSURE\nTRANSMITTER 06', unit: '(mH2O)' },
        { tag: 'A8', label: 'OUTLET PRESSURE\nTRANSMITTER', unit: '(mH2O)' },
        { tag: 'A9', label: 'OUTLET FLOW\nTRANSMITTER ', unit: '(m3/hr)' },
    ];
    drawFullTable(page2, '', cwphTags, data.cwph, 640, font, bold);

    // Third Table - Water Quality Analyzer (CWPH)
    const cwphQualityTags = [
        { tag: 'A11', label: 'pH', unit: '' },
        { tag: 'A12', label: 'CONDUCTIVITY', unit: '(µS/m)' },
        { tag: 'A13', label: 'ORP', unit: '(mV)' },
        { tag: 'A14', label: 'FREE\nCHLORINE', unit: '(mg/L)' },
        { tag: 'A15', label: 'TOTAL\nCHLORINE', unit: '(mg/L)' },
    ];
    drawFullTable(page2, 'CLEAR WATER PUMP HOUSE - WATER QUALITY ANALYZER', cwphQualityTags, data.cwph, 480, font, bold);

    // Fourth Table - Flow Totalizers (CWPH)
    const cwphFlowTags = [
        { tag: 'A10', label: 'OUTLET FLOW TOTALIZER', unit: '' },
    ];
    // Center the table on Page 2
    const cwphFlowTableWidth = 85 * 4;
    const cwphTableCenterX = (595 - cwphFlowTableWidth) / 2;

    drawFlowTable(
        page2,
        'CLEAR WATER PUMP HOUSE - FLOW TOTALIZER',
        cwphFlowTags[0].tag,
        data.cwph,
        cwphTableCenterX,
        320,
        font,
        bold
    );

    // Fifth Table - Pump Run Hours (CWPH)
    drawRunHourTable(page2, 'CLEAR WATER PUMP HOUSE - PUMP RUN HOURS', data.cwphRunHr || [], 200, font, bold, 30);


    // Save the final PDF
    return await pdfDoc.save();

    // fs.writeFileSync(filePath, await pdfDoc.save());
    // return filePath;
};

// 🩶 🩶 🩶 UTILITIES (unchanged) 🩶 🩶 🩶

function drawCell(page, x, y, w, h, text, font, bgColor = rgb(1, 1, 1), isHeader = false, headerFontSize = 5) {
    page.drawRectangle({ x, y: y - h + 2, width: w, height: h, color: bgColor, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    const lines = text.split('\n'), lineHeight = 7;
    let textY = y - h / 2 + (lines.length * lineHeight) / 2 - 3;
    lines.forEach(line => {
        const size = isHeader ? headerFontSize : 5;
        const textX = x + (w - font.widthOfTextAtSize(line, size)) / 2;
        page.drawText(line, { x: textX, y: textY, size, font, color: rgb(0, 0, 0) });
        textY -= lineHeight;
    });
}

function drawFullTable(page, title, tags, rowData, yStart, font, bold, isHeaderRequired = true) {
    const totalTableColumns = tags.length + 1;
    const safePageMargin = 45; // ✅ Updated for more breathing room
    const usableWidth = page.getWidth() - safePageMargin * 2;
    const colWidth = usableWidth / totalTableColumns;
    const rowHeight = 22;
    const startX = safePageMargin;

    if (isHeaderRequired) {
        page.drawText(title, {
            x: (page.getWidth() - bold.widthOfTextAtSize(title, 10)) / 2,
            y: yStart + 14,
            size: 10,
            font: bold,
            color: rgb(0.8, 0, 0)
        });
    }

    const headerColor = rgb(0.392, 0.584, 0.929);
    drawCell(page, startX, yStart, colWidth, rowHeight, '', bold, headerColor, true, 5.5);

    tags.forEach((tag, i) => {
        const label = tag.unit ? `${tag.label}\n${tag.unit}` : tag.label;
        const dynamicFontSize = label.length > 20 ? 4.5 : 5.5;
        drawCell(page, startX + colWidth * (i + 1), yStart, colWidth, rowHeight, label, bold, headerColor, true, dynamicFontSize);
    });

    ['MAX', 'MIN', 'AVG'].forEach((type, rowIdx) => {
        const y = yStart - rowHeight * (rowIdx + 1);
        drawCell(page, startX, y, colWidth, rowHeight, type, bold);
        tags.forEach((tag, i) => {
            const val = (rowData[`${type === 'MAX' ? 'Max' : type === 'MIN' ? 'Min' : 'Avg'}_${tag.tag}`] ?? 0).toFixed(2);
            drawCell(page, startX + colWidth * (i + 1), y, colWidth, rowHeight, val, font);
        });
    });
}


function drawFlowTable(page, title, tag, data, tableX, y, font, bold) {
    // ✅ Perfectly center the heading across the entire A4 page width (595px)
    const pageWidth = page.getWidth();
    const titleWidth = bold.widthOfTextAtSize(title, 9);
    const titleX = (pageWidth - titleWidth) / 2;

    page.drawText(title, {
        x: titleX,
        y: y + 14,
        size: 9,
        font: bold,
        color: rgb(0.8, 0, 0)
    });

    const colWidth = 85, rowHeight = 22, headerColor = rgb(0.392, 0.584, 0.929);
    ['TOTALIZER', 'INITIAL FLOW\n(m3)', 'FINAL FLOW\n(m3)', 'CUM FLOW\n(m3)'].forEach((h, i) =>
        drawCell(page, tableX + i * colWidth, y, colWidth, rowHeight, h, bold, headerColor, true, 5.5));

    // Client rule:
    // Initial = previous window MAX
    // Final   = today window MAX
    // Cum     = Final - Initial (allow negative)

    const prevMax  = parseFloat((data[`PrevMax_${tag}`] ?? 0).toFixed(2));
    const max = parseFloat((data[`Max_${tag}`] ?? 0).toFixed(2));
    const initial = prevMax;
    const cum = parseFloat((max - initial).toFixed(2));

    drawCell(page, tableX, y - rowHeight, colWidth, rowHeight, 'OUTLET FLOW TOTALIZER', bold);
    [initial, max, cum].forEach((v, i) =>
        drawCell(page, tableX + (i + 1) * colWidth, y - rowHeight, colWidth, rowHeight, v.toFixed(2), font));
}


// 🩶 Optimized: Draw Pump Run Hour Table with padding 🩶
function drawRunHourTable(page, title, data, yStart, font, bold, sidePadding = 30) {
    const pageWidth = page.getWidth();
    const usableWidth = pageWidth - sidePadding * 2;
    const colWidth = usableWidth / 4; // now 4 columns
    const rowHeight = 20;

    // Center the title
    page.drawText(title, {
        x: (pageWidth - bold.widthOfTextAtSize(title, 10)) / 2,
        y: yStart + 18,
        size: 10,
        font: bold,
        color: rgb(0.8, 0, 0)
    });

    const headerColor = rgb(0.392, 0.584, 0.929);

    // Updated headers without DATE
    ['PUMP NAME', 'START TIME', 'STOP TIME', 'DURATION'].forEach((header, i) => {
        drawCell(page, sidePadding + i * colWidth, yStart, colWidth, rowHeight, header, bold, headerColor, true, 5.5);
    });

    // Draw each row, skipping DATE
    data.forEach((item, idx) => {
        const y = yStart - rowHeight * (idx + 1);
        drawCell(page, sidePadding + 0 * colWidth, y, colWidth, rowHeight, item.PUMP_NAME || '', font);
        drawCell(page, sidePadding + 1 * colWidth, y, colWidth, rowHeight, item.START_TIME || '', font);
        drawCell(page, sidePadding + 2 * colWidth, y, colWidth, rowHeight, item.STOP_TIME || '', font);
        drawCell(page, sidePadding + 3 * colWidth, y, colWidth, rowHeight, item.DURATION || '', font);
    });
}
