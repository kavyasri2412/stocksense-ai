import React from 'react';
import { PackageOpen, Database, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({ 
  icon: Icon = PackageOpen, 
  title = "No Data Found", 
  description = "There are no records matching your current filter criteria.",
  actionLabel,
  actionLink,
  onAction
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/40 my-6">
      <div className="p-3 rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-400 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-neutral-200">{title}</h4>
      <p className="text-xs text-neutral-400 max-w-sm mt-1.5 leading-relaxed">{description}</p>
      
      {(actionLabel && (actionLink || onAction)) && (
        <div className="mt-5">
          {actionLink ? (
            <Link 
              to={actionLink} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              {actionLabel}
            </Link>
          ) : (
            <button 
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
