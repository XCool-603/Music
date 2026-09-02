import React from 'react';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, action }) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div className="flex items-center gap-2.5 min-w-0">
      {icon && <span className="text-indigo-400 shrink-0">{icon}</span>}
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-white tracking-tight truncate">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
