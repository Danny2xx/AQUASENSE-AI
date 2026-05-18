'use client';
import { useEffect, useState } from 'react';

export interface Bulletin {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  recommended_action?: string;
  timestamp: string;
  _toastId: number;
}

const STYLES: Record<string, string> = {
  critical: 'border-red-500 bg-red-950/90 text-red-100',
  warning:  'border-yellow-500 bg-yellow-950/90 text-yellow-100',
  info:     'border-blue-500 bg-blue-950/90 text-blue-100',
};
const LABEL: Record<string, string> = {
  critical: '🚨 CRITICAL',
  warning:  '⚠️  WARNING',
  info:     'ℹ️  WATCH',
};

interface Props {
  bulletins: Bulletin[];
  onDismiss: (toastId: number) => void;
}

export function BulletinToast({ bulletins, onDismiss }: Props) {
  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
      {bulletins.map(b => (
        <div
          key={b._toastId}
          className={`pointer-events-auto border rounded-lg px-4 py-3 shadow-xl backdrop-blur text-sm animate-in fade-in slide-in-from-right-4 duration-300 ${STYLES[b.severity] ?? STYLES.info}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold text-xs tracking-wider">{LABEL[b.severity]}</span>
            <button
              onClick={() => onDismiss(b._toastId)}
              className="opacity-60 hover:opacity-100 text-lg leading-none mt-[-2px]"
            >×</button>
          </div>
          <p className="mt-1 leading-snug">{b.message}</p>
          {b.recommended_action && (
            <p className="mt-1 opacity-75 text-xs">→ {b.recommended_action}</p>
          )}
          <p className="mt-1 opacity-50 text-xs">{b.timestamp}</p>
        </div>
      ))}
    </div>
  );
}

export function useBulletins() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);

  function push(b: Omit<Bulletin, '_toastId'>) {
    const toastId = Date.now() + Math.random();
    setBulletins(prev => [...prev.slice(-4), { ...b, _toastId: toastId }]);
    // Auto-dismiss: critical after 12s, others after 7s
    setTimeout(() => dismiss(toastId), b.severity === 'critical' ? 12_000 : 7_000);
  }

  function dismiss(toastId: number) {
    setBulletins(prev => prev.filter(b => b._toastId !== toastId));
  }

  return { bulletins, push, dismiss };
}
