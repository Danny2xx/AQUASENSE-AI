'use client';
import { useEffect, useRef, useState } from 'react';
import { SSE_URL } from './api';

export interface LivePrediction {
  timestamp: string;
  facility_id: string;
  status: 'GREEN' | 'WATCH' | 'AMBER' | 'RED' | 'INITIALIZING' | 'UNKNOWN';
  compliance?: {
    status: string;
    breached_parameters: string[];
    warning_parameters: string[];
    margins: Record<string, number>;
  };
  breach_probability_30min?: number;
  breach_risk_label?: string;
  forecasts_30min?: {
    cod_mg_l?: number;
    tss_mg_l?: number;
    bod_mg_l?: number;
    ammonia_mg_l?: number;
    ph?: number;
  };
  anomaly_flag?: boolean;
  anomaly_reason?: string;
  top_drivers?: string[];
  alert_reason?: string;
  recommended_action?: string;
  model_version?: string;
  sufficient_history?: boolean;
}

export interface SensorReading {
  timestamp: string;
  facility_id: string;
  ph?: number;
  cod_mg_l?: number;
  tss_mg_l?: number;
  bod_mg_l?: number;
  ammonia_mg_l?: number;
  temperature_c?: number;
  flow_rate_lps?: number;
  turbidity_ntu?: number;
  dissolved_oxygen_mg_l?: number;
  conductivity_us_cm?: number;
  orp_mv?: number;
  uv254_abs?: number;
  sensor_status?: string;
  event_type?: string;
}

export function useLiveData() {
  const [prediction, setPrediction] = useState<LivePrediction | null>(null);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<LivePrediction[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('sensor.reading', (e) => {
      try { setReading(JSON.parse(e.data)); } catch {}
    });

    es.addEventListener('prediction.full', (e) => {
      try {
        const data: LivePrediction = JSON.parse(e.data);
        setPrediction(data);
        setHistory(prev => {
          const next = [...prev, data];
          return next.slice(-120); // keep last 120 predictions (~10 min of 5-sec ticks)
        });
      } catch {}
    });

    es.onerror = () => setConnected(false);
    es.onopen = () => setConnected(true);

    return () => es.close();
  }, []);

  return { prediction, reading, history, connected };
}
