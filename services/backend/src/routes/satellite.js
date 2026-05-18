import { Router } from 'express';
import { fetchDroughtData } from '../services/satelliteService.js';

const router = Router();

router.get('/drought', async (req, res) => {
  try {
    const data = await fetchDroughtData();
    res.json(data);
  } catch (e) {
    console.error('[satellite]', e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
