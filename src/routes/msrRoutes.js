import express from 'express';
import { getMSRAnalogDetails } from '../controllers/msrController.js';  

const router = express.Router();

// Route to get the latest MSR analog data
router.get('/latest', getMSRAnalogDetails);  
export default router;
