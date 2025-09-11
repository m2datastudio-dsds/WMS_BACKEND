// src/routes/cwphRoutes.js
import { Router } from 'express';
import { getCwphRaw, getCwphTabs } from '../controllers/cwph.controller.js';

const router = Router();

router.get('/raw',  getCwphRaw);
router.get('/tabs', getCwphTabs);

export default router;
