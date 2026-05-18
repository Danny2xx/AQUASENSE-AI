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
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(SSE_URL);
      esRef.current = es;

      es.addEventListener('connected', () => setConnected(true));

      es.addEventListener('sensor.reading', (e) => {
        try { setReading(JSON.parse(e.data)); } catch {}
      });

      es.addEventListener('prediction.full', (e) => {
        try {
          const data: LivePrediction = JSON.parse(e.data);
          setPrediction(data);
          setHistory(prev => [...prev, data].slice(-120));
        } catch {}
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        retryTimer = setTimeout(connect, 3000);
      };

      es.onopen = () => setConnected(true);
    }

    connect();
    return () => { es?.close(); clearTimeout(retryTimer); };
  }, []);

  return { prediction, reading, history, connected };
}
