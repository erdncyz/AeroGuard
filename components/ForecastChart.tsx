import React from 'react';

interface ForecastDay {
  avg: number;
  day: string;
  max: number;
  min: number;
}

interface ForecastChartProps {
  forecast?: {
    daily?: {
      pm25?: ForecastDay[];
      pm10?: ForecastDay[];
      o3?: ForecastDay[];
      uvi?: ForecastDay[];
    };
  };
  lang: 'tr' | 'en';
}

const ForecastChart: React.FC<ForecastChartProps> = ({ forecast, lang }) => {
  if (!forecast?.daily) return null;

  const { pm25, pm10, o3, uvi } = forecast.daily;
  const hasData = (pm25 && pm25.length > 0) || (pm10 && pm10.length > 0) || (o3 && o3.length > 0) || (uvi && uvi.length > 0);
  if (!hasData) return null;

  const primaryData = pm25 || pm10 || o3 || uvi || [];
  const days = primaryData.map(d => {
    const date = new Date(d.day);
    return {
      short: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' }),
      num: date.getDate(),
    };
  });

  const getColor = (val: number, key: string) => {
    if (key === 'UV') {
      if (val <= 2) return { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700' };
      if (val <= 5) return { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-700' };
      if (val <= 7) return { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' };
      if (val <= 10) return { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700' };
      return { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700' };
    }
    if (val <= 50) return { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700' };
    if (val <= 100) return { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-700' };
    if (val <= 150) return { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' };
    if (val <= 200) return { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700' };
    return { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700' };
  };

  const datasets = [
    { key: 'PM2.5', data: pm25, unit: 'µg/m³' },
    { key: 'PM10', data: pm10, unit: 'µg/m³' },
    { key: 'O₃', data: o3, unit: 'ppb' },
    { key: 'UV', data: uvi, unit: 'idx' },
  ].filter(d => d.data && d.data.length > 0);

  const [activeTab, setActiveTab] = React.useState(datasets[0]?.key || 'PM2.5');
  const activeDataset = datasets.find(d => d.key === activeTab);
  const activeData = activeDataset?.data || [];
  const getDescription = (key: string) => {
    const descs: Record<string, Record<string, string>> = {
      'PM2.5': { tr: 'Akciğerlere nüfuz eden ince partiküller. Araç egzozu ve endüstriyel kaynaklı.', en: 'Fine particles that penetrate deep into lungs. From vehicles & industry.' },
      'PM10': { tr: 'Toz ve polen gibi kaba partiküller. Boğaz ve burun tahrişine neden olur.', en: 'Coarse particles like dust & pollen. Irritates throat and nose.' },
      'O₃': { tr: 'Yer seviyesi ozon. Güneşli günlerde artar, solunum yollarını tahriş eder.', en: 'Ground-level ozone. Increases on sunny days, irritates airways.' },
      'UV': { tr: 'Güneşin ultraviyole ışını. Yüksek değerlerde cilt yanığı ve göz hasarı riski.', en: 'Ultraviolet radiation from the sun. High values risk sunburn & eye damage.' },
    };
    return descs[key]?.[lang] || '';
  };

  const getScaleItems = (key: string) => {
    if (key === 'UV') {
      return [
        { label: lang === 'tr' ? '0-2 Düşük' : '0-2 Low', color: 'bg-emerald-400', text: 'text-white' },
        { label: lang === 'tr' ? '3-5 Orta' : '3-5 Moderate', color: 'bg-yellow-400', text: 'text-yellow-900' },
        { label: lang === 'tr' ? '6-7 Yüksek' : '6-7 High', color: 'bg-orange-400', text: 'text-white' },
        { label: lang === 'tr' ? '8-10 Çok Yüksek' : '8-10 Very High', color: 'bg-rose-500', text: 'text-white' },
        { label: lang === 'tr' ? '11+ Aşırı' : '11+ Extreme', color: 'bg-purple-600', text: 'text-white' },
      ];
    }
    return [
      { label: lang === 'tr' ? '0-50 İyi' : '0-50 Good', color: 'bg-emerald-400', text: 'text-white' },
      { label: lang === 'tr' ? '51-100 Orta' : '51-100 Moderate', color: 'bg-yellow-400', text: 'text-yellow-900' },
      { label: lang === 'tr' ? '101-150 Hassas' : '101-150 Sensitive', color: 'bg-orange-400', text: 'text-white' },
      { label: lang === 'tr' ? '151-200 Sağlıksız' : '151-200 Unhealthy', color: 'bg-rose-500', text: 'text-white' },
      { label: lang === 'tr' ? '200+ Tehlikeli' : '200+ Hazardous', color: 'bg-purple-600', text: 'text-white' },
    ];
  };

  const getBarPosition = (val: number, key: string): number => {
    if (key === 'UV') {
      if (val <= 2) return (val / 2) * 20;
      if (val <= 5) return 20 + ((val - 2) / 3) * 20;
      if (val <= 7) return 40 + ((val - 5) / 2) * 20;
      if (val <= 10) return 60 + ((val - 7) / 3) * 20;
      return Math.min(95, 80 + ((val - 10) / 5) * 20);
    }
    if (val <= 50) return (val / 50) * 20;
    if (val <= 100) return 20 + ((val - 50) / 50) * 20;
    if (val <= 150) return 40 + ((val - 100) / 50) * 20;
    if (val <= 200) return 60 + ((val - 150) / 50) * 20;
    return Math.min(95, 80 + ((val - 200) / 100) * 20);
  };

  const activeUnit = activeDataset?.unit || '';
  const activeDescription = getDescription(activeTab);

  const maxVal = Math.max(...activeData.map(d => d.max), 1);
  const today = new Date().toISOString().split('T')[0];

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">
            {activeTab === 'UV'
              ? (lang === 'tr' ? 'UV İndeksi Tahmini' : 'UV Index Forecast')
              : (lang === 'tr' ? 'Hava Kalitesi Tahmini' : 'Air Quality Forecast')}
          </h3>
        </div>

        {/* Pollutant Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {datasets.map(ds => (
            <button
              key={ds.key}
              onClick={() => setActiveTab(ds.key)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${
                activeTab === ds.key
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {ds.key}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Cards */}
      <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
        <div className="flex gap-2 sm:gap-3" style={{ minWidth: activeData.length > 4 ? `${activeData.length * 90}px` : 'auto' }}>
          {activeData.map((d, i) => {
            const color = getColor(d.avg, activeTab);
            const isToday = d.day === today;
            const barH = Math.max((d.avg / maxVal) * 100, 12);
            return (
              <div
                key={i}
                className={`flex-1 min-w-[76px] rounded-2xl p-3 border transition-all ${
                  isToday
                    ? `${color.light} border-current ${color.text} ring-2 ring-offset-1 ring-current/20`
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                {/* Day header */}
                <div className="text-center mb-3">
                  <p className={`text-[9px] font-black uppercase tracking-wider ${isToday ? color.text : 'text-slate-400'}`}>
                    {isToday ? (lang === 'tr' ? 'Bugün' : 'Today') : days[i]?.short}
                  </p>
                  <p className={`text-lg font-black ${isToday ? color.text : 'text-slate-700'}`}>
                    {days[i]?.num}
                  </p>
                </div>

                {/* Bar */}
                <div className="h-24 flex items-end justify-center mb-3">
                  <div className="w-full max-w-[32px] rounded-lg relative" style={{ height: `${barH}%` }}>
                    <div className={`absolute inset-0 rounded-lg ${color.bg} opacity-20`}></div>
                    <div className={`absolute bottom-0 left-0 right-0 rounded-lg ${color.bg}`} style={{ height: `${barH}%` }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-black ${color.text}`}>{d.avg}</span>
                    </div>
                  </div>
                </div>

                {/* Min/Max */}
                <div className="flex items-center justify-between gap-1">
                  <div className="text-center flex-1">
                    <p className="text-[7px] font-bold text-slate-400 uppercase">Min</p>
                    <p className="text-[10px] font-black text-slate-500">{d.min}</p>
                  </div>
                  <div className="w-px h-4 bg-slate-200"></div>
                  <div className="text-center flex-1">
                    <p className="text-[7px] font-bold text-slate-400 uppercase">Max</p>
                    <p className="text-[10px] font-black text-slate-500">{d.max}</p>
                  </div>
                </div>

                {/* Scale bar */}
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-500 relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-700 shadow transition-all"
                      style={{ left: `${getBarPosition(d.avg, activeTab)}%`, marginLeft: '-5px' }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[6px] font-bold text-emerald-500">{lang === 'tr' ? 'İyi' : 'Good'}</span>
                    <span className="text-[6px] font-bold text-red-500">{lang === 'tr' ? 'Kötü' : 'Bad'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scale Legend */}
      <div className="mt-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">
          {activeTab === 'UV'
            ? (lang === 'tr' ? 'UV Skalası' : 'UV Scale')
            : (lang === 'tr' ? 'AQI Skalası' : 'AQI Scale')}
        </p>
        <div className="flex gap-2">
          {getScaleItems(activeTab).map((s, i) => (
            <div key={i} className={`flex-1 ${s.color} ${s.text} rounded-lg py-1.5 text-center`}>
              <span className="text-[7px] font-black leading-tight block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Unit info + description */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
            {activeTab}
          </span>
          <span className="text-[8px] font-bold text-slate-300">•</span>
          <span className="text-[8px] font-bold text-slate-300">{activeUnit}</span>
        </div>
        <p className="text-[9px] text-slate-400 font-medium mt-1.5 leading-relaxed">{activeDescription}</p>
      </div>
    </section>
  );
};

export default ForecastChart;
