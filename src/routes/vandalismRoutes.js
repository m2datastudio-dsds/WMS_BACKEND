import express from 'express';
import { getLatestVandalismData} from '../controllers/vandalismController.js';


const router = express.Router();

router.get('/:tag', getLatestVandalismData);

export default router;