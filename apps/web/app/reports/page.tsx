'use client';
import { useLiveData } from '../../lib/useLiveData';
import { Navigation } from '../../components/Navigation';
import { generateReport, fetchReports } from '../../lib/api';
import { useEffect, useState } from 'react';


interface Report {
  id: number;
  facility_id: string;
  start_time: string;
  end_time: string;
  summary: string;
  incidents_json?: string;
  status_breakdown?: string;
  generated_at: string;
}

function fmtTs(ts: string) {
  try { return new Date(ts).toLocaleString('en-GB'); } catch { return ts; }
}

export default function ReportsPage() {
  const { connected } = useLiveData();
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await fetchReports('demo-food-processing-plant');
    setReports(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
  }

  useEffect(() => { load(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const report = await generateReport('demo-food-processing-plant');
      setReports(prev => [report, ...prev]);
      setSelected(report);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function copyReport() {
    if (selected?.summary) {
      navigator.clipboard.writeText(selected.summary);
    }
  }

  async function downloadPDF() {
    if (!selected) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const lineH = 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AquaSense AI – Compliance Report', margin, 15);

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.text(`Report #${selected.id}  ·  Generated: ${fmtTs(selected.generated_at)}`, margin, 22);
    doc.text(`Period: ${fmtTs(selected.start_time)} → ${fmtTs(selected.end_time)}`, margin, 27);

    doc.setLineWidth(0.3);
    doc.line(margin, 30, 195, 30);

    doc.setFontSize(8);
    const bodyLines = doc.splitTextToSize(selected.summary ?? '', 180);
    let y = 36;
    for (const line of bodyLines) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineH;
    }

    doc.save(`aquasense-report-${selected.id}.pdf`);
  }

  return (
    <>
      <Navigation connected={connected} />
      <main className="mt-10 pt-14 max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Compliance Reports</h1>
            <p className="text-slate-400 text-sm">Auto-generated incident and compliance reports</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md text-slate-200 transition-colors">
              Refresh
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="text-sm bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-1.5 rounded-md text-white transition-colors">
              {generating ? 'Generating…' : '+ Generate Report'}
            </button>
          </div>
        </div>

        {error && (
          <div className="card border border-red-800 text-red-400 text-sm mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report list */}
          <div className="md:col-span-1 space-y-2">
            {reports.length === 0 && (
              <div className="card text-slate-500 text-sm text-center py-6">
                No reports yet. Generate one to start.
              </div>
            )}
            {reports.map(r => (
              <div key={r.id}
                onClick={() => setSelected(r)}
                className={`card cursor-pointer hover:border-blue-500 transition-colors ${selected?.id === r.id ? 'border-blue-500' : 'border-slate-700'}`}>
                <div className="text-xs text-slate-500">#{r.id} · {fmtTs(r.generated_at)}</div>
                <div className="text-sm text-slate-300 mt-1">{fmtTs(r.start_time)} →</div>
                <div className="text-sm text-slate-300">{fmtTs(r.end_time)}</div>
              </div>
            ))}
          </div>

          {/* Report detail */}
          <div className="md:col-span-2">
            {selected ? (
              <div className="card h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-slate-500">Report #{selected.id} · Generated {fmtTs(selected.generated_at)}</div>
                  <div className="flex gap-2">
                    <button onClick={copyReport}
                      className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors">
                      Copy
                    </button>
                    <button onClick={downloadPDF}
                      className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-white transition-colors">
                      ↓ Download PDF
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[70vh]">
                  {selected.summary}
                </pre>
              </div>
            ) : (
              <div className="card text-center py-12 text-slate-500">
                Select a report or generate a new one
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
