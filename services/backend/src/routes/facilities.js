import { Router } from 'express';
import { getBuffer, getNextReading } from '../stream/csvStream.js';
import { getRecentPredictions } from '../services/alertService.js';

const router = Router();

// GET /api/facilities
router.get('/', (req, res) => {
  res.json([
    {
      id: 'demo-food-processing-plant',
      name: 'Demo Food Processing Plant',
      status: 'active',
      location: 'Demo Site, UK',
    }
  ]);
});

// GET /api/facilities/:id/latest
router.get('/:id/latest', (req, res) => {
  const buffer = getBuffer(1);
  if (!buffer.length) return res.json(null);
  res.json(buffer[buffer.length - 1]);
});

// GET /api/facilities/:id/history
router.get('/:id/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const predictions = getRecentPredictions(req.params.id, limit);
  res.json(predictions.reverse()); // oldest first
});

// GET /api/facilities/:id/buffer
router.get('/:id/buffer', (req, res) => {
  const size = Math.min(parseInt(req.query.size) || 30, 200);
  res.json(getBuffer(size));
});

export default router;
