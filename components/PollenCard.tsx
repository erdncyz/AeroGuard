import React from 'react';
import { PollenData, getPollenLevel, getPollenColor } from '../services/pollenService';

interface PollenCardProps {
  pollenData: PollenData;
  lang: 'tr' | 'en';
  cityName?: string;
}

const pollenTypes = [
  { key: 'grass' as const, icon: '🌾', en: 'Grass', tr: 'Çimen' },
  { key: 'birch' as const, icon: '🌳', en: 'Birch', tr: 'Huş Ağacı' },
  { key: 'alder' as const, icon: '🌿', en: 'Alder', tr: 'Kızılağaç' },
  { key: 'mugwort' as const, icon: '🌱', en: 'Mugwort', tr: 'Yavşan Otu' },
  { key: 'olive' as const, icon: '🫒', en: 'Olive', tr: 'Zeytin' },
  { key: 'ragweed' as const, icon: '🌼', en: 'Ragweed', tr: 'Kanarya Otu' },
];

const levelLabels = {
  unknown: { en: 'No data', tr: 'Veri yok' },
  none: { en: 'None', tr: 'Yok' },
  low: { en: 'Low', tr: 'Düşük' },
  moderate: { en: 'Moderate', tr: 'Orta' },
  high: { en: 'High', tr: 'Yüksek' },
  veryHigh: { en: 'Very High', tr: 'Çok Yüksek' },
};

// Scale bar position (0-100%) based on level
const getLevelPosition = (value: number | null): number => {
  if (value === null || value === 0) return 0;
  if (value <= 10) return 20;
  if (value <= 50) return 45;
  if (value <= 100) return 70;
  return 95;
};

const PollenCard: React.FC<PollenCardProps> = ({ pollenData, lang, cityName }) => {
  const values = [pollenData.alder, pollenData.birch, pollenData.grass, pollenData.mugwort, pollenData.olive, pollenData.ragweed];
  // Find the highest pollen level for the overall indicator
  const availableValues = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
  const overallMax = availableValues.length ? Math.max(...availableValues) : null;
  const overallLevel = getPollenLevel(overallMax);
  const overallColor = getPollenColor(overallLevel);

  const observedAt = pollenData.observedAt ? new Date(pollenData.observedAt) : null;
  const observationLabel = observedAt && Number.isFinite(observedAt.getTime())
    ? observedAt.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US') : null;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">
            {lang === 'tr' ? 'Polen Tahmini' : 'Pollen Forecast'}
            {cityName && (
              <span className="text-slate-400 font-bold"> — {cityName}</span>
            )}
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${overallColor.bg} border ${overallColor.border}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${overallColor.dot}`}></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${overallColor.text}`}>
            {levelLabels[overallLevel][lang]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pollenTypes.map(({ key, icon, en, tr }) => {
            const value = pollenData[key];
            const level = getPollenLevel(value);
            const colors = getPollenColor(level);
            const pos = getLevelPosition(value);
            return (
              <div
                key={key}
                className={`${colors.bg} rounded-[1.5rem] p-4 border ${colors.border} transition-all hover:shadow-sm`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest truncate">
                    {lang === 'tr' ? tr : en}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black ${colors.text} leading-none`}>
                    {typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value * 10) / 10 : '—'}
                  </span>
                  <span className="text-[8px] text-slate-300 font-bold">grains/m³</span>
                </div>
                {/* Scale bar */}
                {level !== 'unknown' && <div className="mt-3 mb-1">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-500 relative overflow-visible">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-700 shadow-md transition-all"
                      style={{ left: `${pos}%`, marginLeft: '-6px' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[7px] font-bold text-emerald-500">{lang === 'tr' ? 'Düşük' : 'Low'}</span>
                    <span className="text-[7px] font-bold text-red-500">{lang === 'tr' ? 'Yüksek' : 'High'}</span>
                  </div>
                </div>}
                <p className={`text-[8px] font-bold ${colors.text} uppercase tracking-tight`}>
                  {levelLabels[level][lang]}
                </p>
              </div>
            );
          })}
        </div>

      {/* Polen Skalası */}
      <div className="mt-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">
          {lang === 'tr' ? 'Gösterim amaçlı konsantrasyon skalası (grains/m³)' : 'Indicative concentration scale (grains/m³)'}
        </p>
        <div className="flex gap-2">
          {[
            { label: lang === 'tr' ? '0 Yok' : '0 None', color: 'bg-slate-200', text: 'text-slate-500' },
            { label: lang === 'tr' ? '>0–10 Düşük' : '>0–10 Low', color: 'bg-emerald-400', text: 'text-white' },
            { label: lang === 'tr' ? '>10–50 Orta' : '>10–50 Moderate', color: 'bg-yellow-400', text: 'text-yellow-900' },
            { label: lang === 'tr' ? '>50–100 Yüksek' : '>50–100 High', color: 'bg-orange-400', text: 'text-white' },
            { label: lang === 'tr' ? '>100 Çok Yüksek' : '>100 Very High', color: 'bg-red-500', text: 'text-white' },
          ].map((s, i) => (
            <div key={i} className={`flex-1 ${s.color} ${s.text} rounded-lg py-1.5 text-center`}>
              <span className="text-[7px] font-black leading-tight block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">
        {lang === 'tr'
          ? 'Open-Meteo / CAMS model tahmini. Renkler konsantrasyon karşılaştırması içindir; türlere ve kişiye göre değişen alerji riskini göstermez. Kapsama ve mevsime bağlı olarak veri bulunmayabilir.'
          : 'Open-Meteo / CAMS model forecast. Colors compare concentration, not allergy risk, which varies by species and person. Data may be unavailable outside the covered region or season.'}
        {observationLabel && <span className="block mt-1">{lang === 'tr' ? 'Tahminin geçerli olduğu saat (cihaz saati): ' : 'Forecast valid time (device time): '}{observationLabel}</span>}
      </p>
    </div>
  );
};

export default PollenCard;
