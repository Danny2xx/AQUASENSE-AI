import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AquaSense AI – Wastewater Compliance Platform',
  description: 'Predictive wastewater compliance monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Restore saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('aquasense-theme');
              if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
            } catch(e) {}
          `
        }} />
      </head>
      <body className="min-h-screen bg-slate-900">
        {children}
      </body>
    </html>
  );
}
