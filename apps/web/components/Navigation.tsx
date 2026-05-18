'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldAlert, BellRing, FileText, Activity } from 'lucide-react';
import { StatusDot } from './StatusBadge';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/alerts', label: 'Alerts', icon: BellRing },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/data-quality', label: 'Data Quality', icon: Activity },
];

export function Navigation({ connected }: { connected: boolean }) {
  const path = usePathname();
  return (
    <nav className="aqua-nav fixed top-0 left-0 right-0 z-50 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <div className="flex items-center gap-2 mr-4">
          <span className="text-blue-400 font-bold text-lg tracking-tight">AquaSense AI</span>
          <span className="text-slate-500 text-xs">v1.0</span>
        </div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              path.startsWith(href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <StatusDot status={connected ? 'GREEN' : 'RED'} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
