import { Router } from 'express';
import { getAlerts, getActiveAlerts, acknowledgeAlert } from '../services/alertService.js';

const router = Router();

// GET /api/alerts?facility_id=...&limit=50
router.get('/', (req, res) => {
  const facilityId = req.query.facility_id || 'demo-food-processing-plant';
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const active = req.query.active === 'true';
  if (active) {
    const alerts = getActiveAlerts(facilityId);
    res.json({ alerts, total: alerts.length });
  } else {
    res.json(getAlerts(facilityId, limit));
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', (req, res) => {
  acknowledgeAlert(req.params.id);
  res.json({ ok: true });
});

export default router;
