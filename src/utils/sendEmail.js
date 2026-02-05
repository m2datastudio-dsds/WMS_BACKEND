// src/utils/sendEmail.js

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Sends an email with multiple PDF attachments.
 * @param {string[]} pdfFilePaths - Array of PDF file paths to attach
 * @param {string} reportDateFormatted - Report date in DD-MM-YYYY
 */
const sendEmail = (pdfFilePaths, reportDateFormatted, reportPeriodText = '') => {
  // Check if all files exist
  const missingFiles = pdfFilePaths.filter(filePath => !fs.existsSync(filePath));
  if (missingFiles.length > 0) {
    console.error('Error: The following files do not exist:', missingFiles);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS, // App-specific password
    },
  });

  const attachments = pdfFilePaths.map(filePath => ({
    filename: path.basename(filePath),
    path: filePath,
  }));

  // ✅ Dynamic list for body:
  const list = pdfFilePaths
    .map((filePath, index) => {
      const fileName = path.basename(filePath).replace(/_/g, ' ').replace('.pdf', '');
      return `${index + 1}️⃣ ${fileName}`;
    })
    .join('\n');

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: [
      'cityengineer.coimbatore@gmail.com',
      'eetwadrwscbe2023@gmail.com',
      'pillur3project@gmail.com',
      'thinsaran@sias.co.in',
      'rajendran.p@meghaeng.com',
      'venkateshwarank12@gmail.com',
      'vasan2051@gmail.com',
    ],
    subject: `Daily Water Supply Reports (${reportPeriodText}) - ${reportDateFormatted}`,
    text: `Dear Team,

Please find attached the daily water supply reports for ${reportDateFormatted}.
Report Period: ${reportPeriodText || '06:00 to 06:00'}, including:

${list}

Let me know if you need any clarifications.

Regards,
Automated Report System`,

    attachments
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Error occurred while sending email:', error);
    } else {
      console.log(`✅ Email sent successfully: ${info.response}`);
    }
  });
};

export default sendEmail;
