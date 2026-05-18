'use client';

const BADGE_CLASSES: Record<string, string> = {
  GREEN: 'badge-green',
  WATCH: 'badge-watch',
  AMBER: 'badge-amber',
  RED: 'badge-red',
  COMPLIANT: 'badge-green',
  WARNING: 'badge-amber',
  BREACH: 'badge-red',
  INITIALIZING: 'badge-gray',
  UNKNOWN: 'badge-gray',
};

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const cls = BADGE_CLASSES[status?.toUpperCase()] ?? 'badge-gray';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${cls} ${className}`}>
      {status}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    GREEN: 'bg-green-500',
    WATCH: 'bg-blue-500',
    AMBER: 'bg-yellow-500',
    RED: 'bg-red-500',
  };
  const cls = colors[status?.toUpperCase()] ?? 'bg-gray-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls} animate-pulse`} />;
}
