import React from 'react';

export default function LoadingSpinner({ text = "Loading verified database records..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="w-8 h-8 border-2 border-neutral-700 border-t-emerald-400 rounded-full animate-spin" />
      <span className="text-xs font-mono text-neutral-400">{text}</span>
    </div>
  );
}
