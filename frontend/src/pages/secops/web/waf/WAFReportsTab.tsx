import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Plus,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';
import { getWafReports, generateWafReport, downloadWafEventsCsv } from '@/services/wafApi';
import { ReportItem } from '@/types/waf';

export const WAFReportsTab: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getWafReports();
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const title = `WAF Threat Intelligence Report (${new Date().toLocaleDateString()})`;
      await generateWafReport(title, 24);
      await fetchReports();
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadWafEventsCsv();
    } catch (err) {
      console.error('Export CSV failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions */}
      <div className="fanos-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            WAF Compliance & Threat Intelligence Reports
          </h4>
          <p className="text-[11px] text-fanos-dim mt-0.5">
            Snapshot analysis, historical attack distributions, and audit-ready security metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{exporting ? 'Exporting...' : 'Export Events CSV'}</span>
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="fanos-btn px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
          >
            {generating ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{generating ? 'Generating...' : 'Generate New Report'}</span>
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-fanos-dim font-mono">
            <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading generated reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-fanos-dim font-mono">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600 stroke-1" />
            No compliance reports generated yet. Click "Generate New Report" to create a 24-hour threat summary.
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="fanos-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-white truncate max-w-[200px]">{report.title}</div>
                  <div className="text-[10px] text-fanos-dim mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.generated_at).toLocaleString()}
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {report.time_range || '24h'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-black/40 border border-white/[0.05] text-center">
                <div>
                  <span className="text-[8px] font-bold text-fanos-dim uppercase">Inspected</span>
                  <div className="font-mono text-xs font-bold text-white mt-0.5">
                    {report.total_inspected.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-fanos-dim uppercase">Allowed</span>
                  <div className="font-mono text-xs font-bold text-emerald-400 mt-0.5">
                    {report.total_allowed.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-fanos-dim uppercase">Blocked</span>
                  <div className="font-mono text-xs font-bold text-rose-400 mt-0.5">
                    {report.total_blocked.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-fanos-dim flex items-center justify-between pt-1">
                <span>Deterministic Rules Engine</span>
                <span className="text-cyan-400 font-semibold cursor-pointer hover:underline">
                  Verified Summary
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
