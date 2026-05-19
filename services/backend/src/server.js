import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initStream, getBuffer, getNextReading } from './stream/csvStream.js';
import { predictFull, healthCheck } from './services/mlClient.js';
import { evaluateAndSaveAlert } from './services/alertService.js';
import { sendBulletin } from './services/notificationService.js';
import facilitiesRouter from './routes/facilities.js';
import alertsRouter from './routes/alerts.js';
import reportsRouter from './routes/reports.js';
import chatRouter from './routes/chat.js';
import satelliteRouter from './routes/satellite.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// SSE clients
const sseClients = new Set();

// Routes
app.use('/api/facilities', facilitiesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/satellite', satelliteRouter);

// GET /api/health
app.get('/api/health', async (req, res) => {
  try {
    const mlHealth = await healthCheck();
    res.json({ status: 'ok', ml_service: mlHealth });
  } catch {
    res.json({ status: 'ok', ml_service: { status: 'unreachable' } });
  }
});

// GET /api/stream/live  –  Server-Sent Events
app.get('/api/stream/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send a heartbeat immediately
  res.write('event: connected\ndata: {}\n\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Sensor replay loop
let latestPrediction = null;

async function tick() {
  try {
    const reading = getNextReading();
    if (!reading) return;

    // Broadcast raw reading
    broadcast('sensor.reading', reading);

    // Build rolling buffer for feature engineering (last 30 rows = 150 min at 5-min intervals)
    const buffer = getBuffer(30);

    // Call ML service
    let prediction = null;
    try {
      prediction = await predictFull(buffer);
      latestPrediction = prediction;

      // Save prediction and maybe create alert; broadcast bulletin if one was created
      const newAlert = evaluateAndSaveAlert(prediction);
      if (newAlert) {
        broadcast('bulletin.alert', newAlert);
        sendBulletin(newAlert).catch(() => {}); // fire-and-forget, never crash tick
      }

      // Broadcast full prediction event
      broadcast('prediction.full', prediction);
      broadcast('compliance.current', {
        status: prediction.status,
        compliance: prediction.compliance,
        timestamp: prediction.timestamp,
      });
      broadcast('prediction.breach_risk', {
        breach_probability_30min: prediction.breach_probability_30min,
        breach_risk_label: prediction.breach_risk_label,
        top_drivers: prediction.top_drivers,
        alert_reason: prediction.alert_reason,
        timestamp: prediction.timestamp,
      });
      broadcast('prediction.forecast_30min', {
        forecasts_30min: prediction.forecasts_30min,
        timestamp: prediction.timestamp,
      });
      if (prediction.anomaly_flag) {
        broadcast('anomaly.sensor_quality', {
          anomaly_flag: true,
          anomaly_reason: prediction.anomaly_reason,
          timestamp: prediction.timestamp,
        });
      }
    } catch (mlErr) {
      console.error('ML service error:', mlErr.message);
      // Broadcast reading even without prediction
      broadcast('prediction.full', {
        timestamp: reading.timestamp,
        facility_id: reading.facility_id,
        status: 'UNKNOWN',
        ml_error: mlErr.message,
        current_readings: reading,
      });
    }
  } catch (err) {
    console.error('Tick error:', err.message);
  }
}

// GET /api/latest – latest prediction snapshot for polling
app.get('/api/latest', (req, res) => {
  res.json(latestPrediction || { status: 'INITIALIZING' });
});

// Start
app.listen(PORT, async () => {
  console.log(`AquaSense backend listening on port ${PORT}`);
  await initStream();
  console.log('Starting sensor replay...');

  // Tick every 2 seconds (each row = 5-min IoT interval in demo time)
  setInterval(tick, 2000);
  // Run first tick immediately
  tick();
});
