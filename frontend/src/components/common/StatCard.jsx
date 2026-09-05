import React from 'react';
import { ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendDirection = 'neutral', // up, down, neutral
  badge,
  variant = 'default', // default, critical, warning, success
  evidenceData
}) {
  const { openEvidence } = useAuth();

  const variantStyles = {
    default: 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/90',
    critical: 'border-rose-900/40 bg-rose-950/10 hover:border-rose-800/60',
    warning: 'border-amber-900/40 bg-amber-950/10 hover:border-amber-800/60',
    success: 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-800/60',
  };

  const iconColors = {
    default: 'text-neutral-400 bg-neutral-800',
    critical: 'text-rose-400 bg-rose-950/40 border border-rose-800/50',
    warning: 'text-amber-400 bg-amber-950/40 border border-amber-800/50',
    success: 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50',
  };

  return (
    <div className={`p-5 rounded-xl border transition-all duration-200 hover-elevate ${variantStyles[variant] || variantStyles.default}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={`p-2 rounded-lg ${iconColors[variant] || iconColors.default}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-neutral-100 font-mono">
          {value}
        </h3>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center text-xs font-semibold ${
            trendDirection === 'up' ? 'text-emerald-400' : 
            trendDirection === 'down' ? 'text-rose-400' : 'text-neutral-400'
          }`}>
            {trendDirection === 'up' && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
            {trendDirection === 'down' && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            <span>{typeof trend === 'number' ? `${trend > 0 ? '+' : ''}${trend}%` : trend}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-neutral-500">
        <span>{subtitle}</span>
        {evidenceData && (
          <button
            onClick={() => openEvidence({ title, ...evidenceData })}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors"
            title="View calculation formula & verified database provenance"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit</span>
          </button>
        )}
      </div>
    </div>
  );
}
