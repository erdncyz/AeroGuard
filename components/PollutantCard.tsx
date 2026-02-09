
import React from 'react';

interface PollutantCardProps {
  label: string;
  value: number | undefined;
  unit: string;
  description: string;
}

const PollutantCard: React.FC<PollutantCardProps> = ({ label, value, unit, description }) => {
  
  const getPollutantColor = () => {
    if (value === undefined) return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' };
    
    const labelLower = label.toLowerCase();
    
    // PM2.5 değerlendirmesi (µg/m³)
    if (labelLower.includes('pm 2.5') || labelLower.includes('pm2.5')) {
      if (value <= 12) return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' };
      if (value <= 35) return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' };
      if (value <= 55) return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' };
      return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' };
    }
    
    // PM10 değerlendirmesi (µg/m³)
    if (labelLower.includes('pm 10') || labelLower.includes('pm10')) {
      if (value <= 50) return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' };
      if (value <= 150) return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' };
      if (value <= 250) return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' };
      return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' };
    }
    
    // Ozon (O₃) değerlendirmesi (ppb)
    if (labelLower.includes('ozon') || labelLower.includes('o₃') || labelLower.includes('o3')) {
      if (value <= 54) return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' };
      if (value <= 70) return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' };
      if (value <= 85) return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' };
      return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' };
    }
    
    // NO₂ değerlendirmesi (ppb)
    if (labelLower.includes('azot') || labelLower.includes('no₂') || labelLower.includes('no2')) {
      if (value <= 53) return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' };
      if (value <= 100) return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' };
      if (value <= 360) return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' };
      return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' };
    }
    
    return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' };
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
            {value !== undefined ? value : '—'}
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
