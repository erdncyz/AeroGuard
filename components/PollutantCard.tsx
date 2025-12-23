
import React from 'react';

interface PollutantCardProps {
  label: string;
  value: number | undefined;
  unit: string;
  description: string;
}

const PollutantCard: React.FC<PollutantCardProps> = ({ label, value, unit, description }) => {
  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98] duration-200">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{label}</h4>
          <span className="text-[8px] text-slate-300 font-bold uppercase">{unit}</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl sm:text-2xl font-black text-slate-800 leading-none">
            {value !== undefined ? value : '—'}
          </span>
        </div>
        <p className="text-[8px] sm:text-[9px] text-slate-500 mt-2 font-medium leading-tight line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
};

export default PollutantCard;
