import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AquaSense AI – Wastewater Compliance Platform',
  description: 'Predictive wastewater compliance monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900">
        {children}
      </body>
    </html>
  );
}
