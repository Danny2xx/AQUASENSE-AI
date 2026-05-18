'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  BellRing,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  FileText,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  X,
} from 'lucide-react';
import { StatusDot } from './StatusBadge';
import { ThemeToggle } from './ThemeToggle';
import { BulletinToast, useBulletins } from './BulletinToast';
import { useLiveData } from '../lib/useLiveData';
import { ChatBot } from './ChatBot';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/alerts', label: 'Alerts', icon: BellRing },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/data-quality', label: 'Data Quality', icon: Activity },
  { href: '/drought', label: 'Drought', icon: CloudRain },
];

export function Navigation({ connected }: { connected: boolean }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { bulletins, push, dismiss } = useBulletins();
  useLiveData(push);

  useEffect(() => {
    const saved = localStorage.getItem('aquasense-sidebar-collapsed');
    if (saved) setCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', String(collapsed));
    localStorage.setItem('aquasense-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  return (
    <>
      <button
        type="button"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(open => !open)}
        className="aqua-mobile-menu fixed left-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-900/95 text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-slate-800 md:hidden"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`aqua-nav fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur transition-[width,transform] duration-200 ease-out md:translate-x-0 ${
          collapsed ? 'md:w-[4.75rem]' : 'md:w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className={`flex min-h-12 items-center gap-3 ${collapsed ? 'md:justify-center' : 'justify-between'}`}>
            <Link href="/dashboard" className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-slate-100 transition-colors hover:bg-slate-800 ${collapsed ? 'md:justify-center md:gap-0' : ''}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                <CloudRain size={17} />
              </span>
              <span className={`min-w-0 transition-opacity duration-200 ${collapsed ? 'md:pointer-events-none md:w-0 md:opacity-0' : 'opacity-100'}`}>
                <span className="block truncate text-base font-bold tracking-tight text-blue-400">AquaSense AI</span>
                <span className="block text-xs text-slate-500">v1.0</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(value => !value)}
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 md:flex ${collapsed ? 'md:absolute md:right-3 md:top-16' : ''}`}
              title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto pt-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  path.startsWith(href)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                } ${collapsed ? 'md:justify-center md:gap-0 md:px-0' : ''}`}
              >
                <Icon size={17} className="shrink-0" />
                <span className={`truncate transition-opacity duration-200 ${collapsed ? 'md:pointer-events-none md:w-0 md:opacity-0' : 'opacity-100'}`}>
                  {label}
                </span>
              </Link>
            ))}
          </div>

          <div className={`mt-auto flex border-t border-slate-700 pt-3 ${collapsed ? 'md:flex-col md:items-center md:gap-3' : 'items-center justify-between gap-3'}`}>
            <div className={`flex items-center gap-2 text-xs text-slate-500 ${collapsed ? 'md:justify-center md:gap-0' : ''}`} title={connected ? 'Live' : 'Disconnected'}>
              <StatusDot status={connected ? 'GREEN' : 'RED'} />
              <span className={`transition-opacity duration-200 ${collapsed ? 'md:pointer-events-none md:w-0 md:opacity-0' : 'opacity-100'}`}>
                {connected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <BulletinToast bulletins={bulletins} onDismiss={dismiss} />
      <ChatBot />
    </>
  );
}
