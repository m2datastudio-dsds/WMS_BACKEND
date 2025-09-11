import express from 'express';
import { generateAndSendReports } from '../generateAndSendReports.js';

const router = express.Router();

router.get('/send-reports', async (req, res) => {
  try {
    const result = await generateAndSendReports();

    if (result?.skipped) {
      console.log('⚠️ No data found to generate report.');
      return res.status(200).json({
        message: '⚠️ No data found to generate report.',
        data: null
      });
    }

    // ✅ Console log for debugging
    console.log('📤 Report Data Sent:', {
      reportDate: result.reportDate,
      rwphcwph: result.rwphcwph,
      mstmsrmbr: result.mstmsrmbr,
      transmission: result.transmission
    });

    // ✅ Send full JSON response
    res.status(200).json({
      message: '✅ Reports generated and emailed successfully.',
      reportDate: result.reportDate,
      rwphcwph: result.rwphcwph,
      mstmsrmbr: result.mstmsrmbr,
      transmission: result.transmission
    });

  } catch (error) {
    console.error('❌ Error in sending reports:', error);
    res.status(500).json({
      error: '❌ Error generating or sending reports.'
    });
  }
});

export default router;
