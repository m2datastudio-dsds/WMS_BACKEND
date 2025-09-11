import express from 'express';
import { getMBRAnalogDetails } from '../controllers/mbrAnalogController.js';

const router = express.Router();

router.get('/latest', getMBRAnalogDetails);

export default router;
