import express from 'express';
import { getMSSAnalogDetails } from '../controllers/mstController.js';

const router = express.Router();

// Route to get the latest MSS analog data
router.get('/latest', getMSSAnalogDetails);

export default router;
