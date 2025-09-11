// src/routes/rwphRoutes.js
import { Router } from 'express';
import { getRwphRaw, getRwphTabs } from '../controllers/rwph.controller.js';

const router = Router();
router.get('/raw',  getRwphRaw);
router.get('/tabs', getRwphTabs);
export default router;
