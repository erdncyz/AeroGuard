
import React from 'react';

interface PollutantCardProps {
  label: string;
  value: number | null | undefined;
  unit: string;
  description: string;
}

const PollutantCard: React.FC<PollutantCardProps> = ({ label, value, unit, description }) => {
  const hasValue = typeof value === 'number' && Number.isFinite(value) && value >= 0;

  const getPollutantColor = () => {
    if (!hasValue) return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' };
    // WAQI iaqi pollutant values are individual AQI indices, not concentrations.
    if (value <= 50) return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' };
    if (value <= 100) return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' };
    if (value <= 150) return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' };
    if (value <= 200) return { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200' };
    if (value <= 300) return { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' };
    return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' };
  };

  const colors = getPollutantColor();
  
  return (
    <div className={`${colors.bg} rounded-[1.5rem] p-4 shadow-sm border ${colors.border} hover:shadow-md transition-all active:scale-[0.98] duration-200`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{label}</h4>
          <span className="text-[8px] text-slate-300 font-bold uppercase">{unit}</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-xl sm:text-2xl font-black ${colors.text} leading-none`}>
            {hasValue ? value : '—'}
          </span>
        </div>
        <p className="text-[8px] sm:text-[9px] text-slate-500 mt-2 font-medium leading-tight">
          {description}
        </p>
      </div>
    </div>
  );
};

export default PollutantCard;
