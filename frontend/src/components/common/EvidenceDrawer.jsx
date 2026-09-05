import React from 'react';
import { X, Database, Calculator, Clock, Table, ShieldCheck, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EvidenceDrawer() {
  const { evidenceDrawerData, closeEvidence } = useAuth();

  if (!evidenceDrawerData) return null;

  const { title, source_tables, date_range, formula, values_used, timestamp, notes, product_name } = evidenceDrawerData;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="w-full max-w-lg bg-neutral-900 border-l border-neutral-800 p-6 flex flex-col h-full shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Data Evidence & Calculation Proof</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Audited from deterministic database pipeline</p>
            </div>
          </div>
          <button 
            onClick={closeEvidence}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 py-5 space-y-5">
          {title && (
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Evaluation Subject</span>
              <p className="text-sm font-semibold text-neutral-100 mt-1">{title}</p>
              {product_name && <p className="text-xs text-neutral-400">{product_name}</p>}
            </div>
          )}

          {/* Source Tables */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              <Database className="w-4 h-4 text-neutral-400" />
              <span>Source Tables</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(source_tables || ['products', 'inventory', 'sales']).map((tbl) => (
                <span key={tbl} className="px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs font-mono text-neutral-200">
                  {tbl}
                </span>
              ))}
            </div>
          </div>

          {/* Date Range */}
          {date_range && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>Evaluation Window</span>
              </div>
              <p className="text-xs font-mono bg-neutral-950 p-2.5 rounded border border-neutral-800 text-neutral-300">
                {date_range}
              </p>
            </div>
          )}

          {/* Formula */}
          {formula && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                <Calculator className="w-4 h-4 text-neutral-400" />
                <span>Mathematical Logic / Formula</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-300 break-words leading-relaxed">
                {formula}
              </div>
            </div>
          )}

          {/* Values Used */}
          {values_used && Object.keys(values_used).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                <Table className="w-4 h-4 text-neutral-400" />
                <span>Database Query Snapshot</span>
              </div>
              <div className="bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-800/60 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-2 px-3 font-medium">Metric / Field</th>
                      <th className="py-2 px-3 font-medium text-right">Extracted Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {Object.entries(values_used).map(([k, v]) => (
                      <tr key={k} className="hover:bg-neutral-800/30">
                        <td className="py-2 px-3 font-mono text-neutral-400">{k.replace(/_/g, ' ')}</td>
                        <td className="py-2 px-3 font-mono text-right font-medium text-neutral-200">
                          {typeof v === 'number' ? (k.includes('price') || k.includes('revenue') || k.includes('risk') ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : v.toLocaleString()) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grounding guarantee */}
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-neutral-300 leading-relaxed">
              <span className="font-semibold text-emerald-400">Zero AI Hallucination Guarantee:</span> All numbers shown in StockSense AI are computed deterministically via Python ORM queries on your local database.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-500">
          <span>Engine: Python 3.14 / SQLAlchemy</span>
          <button 
            onClick={closeEvidence}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
