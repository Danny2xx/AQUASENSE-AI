import { Router } from 'express';
import { generateReport, getReports, getReport } from '../services/reportService.js';

const router = Router();

// POST /api/reports/generate
router.post('/generate', (req, res) => {
  const facilityId = req.body?.facility_id || 'demo-food-processing-plant';
  const report = generateReport(facilityId);
  if (!report) {
    return res.status(404).json({ error: 'No data available to generate report' });
  }
  res.json(report);
});

// GET /api/reports?facility_id=...
router.get('/', (req, res) => {
  const facilityId = req.query.facility_id || 'demo-food-processing-plant';
  res.json(getReports(facilityId));
});

// GET /api/reports/:id
router.get('/:id', (req, res) => {
  const report = getReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  // Parse JSON fields
  try {
    report.incidents = JSON.parse(report.incidents_json || '[]');
    report.status_breakdown = JSON.parse(report.status_breakdown || '{}');
  } catch {}

  res.json(report);
});

export default router;
