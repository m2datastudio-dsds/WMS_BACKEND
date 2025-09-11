// src/cron/dailyReportCron.js

import cron from 'node-cron';
import { generateAndSendReports } from '../generateAndSendReports.js';

// Function to start the daily report cron job
export const startCronJobs = () => {
  // Schedule to run daily at 6:00 AM IST
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log('⏰ Running daily report cron at 6:00 AM IST...');
      await generateAndSendReports();
      console.log('✅ Daily reports generation and email completed.');
    } catch (error) {
      console.error('❌ Error in daily report cron job:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('⏰ Daily report cron scheduled for 6:00 AM IST.');
};
