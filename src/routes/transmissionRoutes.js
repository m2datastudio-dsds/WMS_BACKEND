// routes/transmissionRoutes.js
import express from 'express';
import { getLatestTransmissionData , getRWPHData} from '../controllers/transmissionController.js';


const router = express.Router();

router.get('/:tag', getLatestTransmissionData);
router.get('/rwphreport',getRWPHData);

export default router;


