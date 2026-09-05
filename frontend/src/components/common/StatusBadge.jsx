import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, PackageX, HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  if (!status) return null;

  const st = status.toLowerCase();

  const configs = {
    critical: {
      label: 'Critical',
      className: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
      dotClass: 'bg-rose-500',
      icon: AlertCircle
    },
    'low stock': {
      label: 'Low Stock',
      className: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
      dotClass: 'bg-amber-500',
      icon: AlertTriangle
    },
    healthy: {
      label: 'Healthy',
      className: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2
    },
    overstock: {
      label: 'Overstock',
      className: 'bg-zinc-800/60 text-zinc-300 border-zinc-700',
      dotClass: 'bg-zinc-400',
      icon: PackageX
    },
    'no sales data': {
      label: 'No Sales Data',
      className: 'bg-zinc-900/60 text-zinc-400 border-zinc-800',
      dotClass: 'bg-zinc-500',
      icon: HelpCircle
    },
    high: {
      label: 'High Priority',
      className: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
      dotClass: 'bg-amber-500',
      icon: AlertTriangle
    },
    medium: {
      label: 'Medium Priority',
      className: 'bg-zinc-800/60 text-zinc-300 border-zinc-700',
      dotClass: 'bg-zinc-400',
      icon: AlertCircle
    },
    low: {
      label: 'Low Priority',
      className: 'bg-zinc-900/60 text-zinc-400 border-zinc-800',
      dotClass: 'bg-zinc-500',
      icon: CheckCircle2
    },
    'sales spike': {
      label: 'Demand Surge',
      className: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
      dotClass: 'bg-emerald-500',
      icon: ArrowUpRight
    },
    'sales drop': {
      label: 'Sales Drop',
      className: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
      dotClass: 'bg-rose-500',
      icon: ArrowDownRight
    }
  };

  const current = configs[st] || {
    label: status,
    className: 'bg-zinc-800/50 text-zinc-300 border-zinc-700',
    dotClass: 'bg-zinc-400',
    icon: AlertCircle
  };

  const Icon = current.icon;
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg' 
    ? 'px-3 py-1 text-sm' 
    : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${current.className} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dotClass} animate-pulse-subtle`} />
      {current.label}
    </span>
  );
}
