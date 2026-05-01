import React, { useState } from 'react';
import { DailyAQIHistory } from '../services/aqiHistoryService';

interface AQIHistoryChartProps {
  history: DailyAQIHistory[];
  lang: 'tr' | 'en';
  uviForecast?: number[];
}

type Metric = 'pm25' | 'pm10' | 'o3' | 'uv';

const getBarColor = (val: number): string => {
  if (val <= 12)  return '#10b981'; // emerald – good (WHO guideline pm2.5 ≤12)
  if (val <= 35)  return '#f59e0b'; // yellow – moderate
  if (val <= 55)  return '#f97316'; // orange – unhealthy sensitive
  if (val <= 150) return '#ef4444'; // red – unhealthy
  return '#9333ea';                 // purple – very unhealthy / hazardous
};

const getBarColorPM10 = (val: number): string => {
  if (val <= 20)  return '#10b981';
  if (val <= 50)  return '#f59e0b';
  if (val <= 100) return '#f97316';
  if (val <= 200) return '#ef4444';
  return '#9333ea';
};

const getBarColorO3 = (val: number): string => {
  if (val <= 54)  return '#10b981';
  if (val <= 70)  return '#f59e0b';
  if (val <= 85)  return '#f97316';
  if (val <= 105) return '#ef4444';
  return '#9333ea';
};

const getBarColorUV = (val: number): string => {
  if (val <= 2)   return '#10b981'; // emerald – low
  if (val <= 5)   return '#f59e0b'; // yellow – moderate
  if (val <= 7)   return '#f97316'; // orange – high
  if (val <= 10)  return '#ef4444'; // red – very high
  return '#9333ea';                 // purple – extreme
};

const AQIHistoryChart: React.FC<AQIHistoryChartProps> = ({ history, lang }) => {
  const [metric, setMetric] = useState<Metric>('pm25');

  if (!history || history.length === 0) return null;

  const metricLabels: Record<Metric, string> = { pm25: 'PM2.5', pm10: 'PM10', o3: 'O₃', uv: 'UV' };
  const metricUnits: Record<Metric, string> = { pm25: 'µg/m³', pm10: 'µg/m³', o3: 'ppb', uv: 'Index' };
  const metricDescriptions: Record<Metric, { tr: string; en: string }> = {
    pm25: {
      tr: 'Akciğer derinliklerine kadar nüfuz eden ince partiküller. Araç egzozu ve endüstriyel dumandan kaynaklanır.',
      en: 'Fine particles that penetrate deep into the lungs. Mainly from vehicle exhaust and industrial smoke.',
    },
    pm10: {
      tr: 'Toz, toprak ve polenden oluşan kaba partiküller. Burun ve boğazı tahriş eder.',
      en: 'Coarse particles from dust, soil and pollen. Irritates the nose and throat.',
    },
    o3: {
      tr: 'Güneşli ve sıcak günlerde artan yer seviyesi ozon. Solunum yollarını tahriş eder.',
      en: 'Ground-level ozone that rises on sunny, hot days. Irritates airways and reduces lung function.',
    },
    uv: {
      tr: 'Ultraviyole radyasyonun yoğunluğu. Yüksek UV endeksi cilt ve göz hasarı riski artırır.',
      en: 'Intensity of ultraviolet radiation. High UV index increases risk of skin and eye damage.',
    },
  };

  const values = metric === 'uv' 
    ? (uviForecast || []).slice(0, 7).map(v => v ?? 0)
    : history.map(d => d[metric as keyof DailyAQIHistory] ?? 0);
  const maxVal = Math.max(...values, 1);

  // Trend: compare last 3 days avg vs first 3 days avg
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const avgFirst  = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
  const trend = avgSecond < avgFirst ? 'improving' : avgSecond > avgFirst ? 'worsening' : 'stable';

  const trendConfig = {
    improving: { icon: '↓', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: { tr: 'İyileşiyor', en: 'Improving' } },
    worsening: { icon: '↑', color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       label: { tr: 'Kötüleşiyor', en: 'Worsening' } },
    stable:    { icon: '→', color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',     label: { tr: 'Stabil', en: 'Stable' } },
  };
  const tc = trendConfig[trend];

  const getColor = (val: number) => {
    if (metric === 'pm25') return getBarColor(val);
    if (metric === 'pm10') return getBarColorPM10(val);
    if (metric === 'uv') return getBarColorUV(val);
    return getBarColorO3(val);
  };

  const today = new Date().toISOString().split('T')[0];

  const chartHeight = 120;
  const barWidth = 28;
  const gap = 12;
  const svgWidth = history.length * (barWidth + gap) - gap;

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 p-2 rounded-xl text-violet-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">
            {lang === 'tr' ? 'Son 7 Gün Geçmişi' : '7-Day History'}
          </h3>
        </div>

        {/* Metric Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['pm25', 'pm10', 'o3', 'uv'] as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${
                metric === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Trend badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black mb-4 ${tc.bg} ${tc.color}`}>
        <span className="text-sm font-black">{tc.icon}</span>
        <span>{lang === 'tr' ? 'Trend:' : 'Trend:'} {tc.label[lang]}</span>
      </div>

      {/* Metric description */}
      <div className="mb-5 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          {metricDescriptions[metric][lang]}
        </p>
      </div>

      {/* SVG Bar Chart */}
      <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight + 40}`}
          width={Math.max(svgWidth, 280)}
          height={chartHeight + 40}
          className="overflow-visible"
        >
          {(metric === 'uv' ? (uviForecast || []).slice(0, 7).map((v, i) => ({ val: v ?? 0, i, date: new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }))
            : history).map((item, idx) => {
              const isUV = metric === 'uv';
              const val = isUV ? (item as any).val : (item as any)[metric] ?? 0;
              const i = isUV ? (item as any).i : idx;
              const date = new Date(isUV ? (item as any).date : (item as any).date);
              const barH = Math.max((val / maxVal) * chartHeight, 6);
              const x = i * (barWidth + gap);
              const y = chartHeight - barH;
              const color = getColor(val);
              const isToday = (isUV ? (item as any).date : (item as any).date) === today;
              const dayLabel = isToday
                ? (lang === 'tr' ? 'Bug.' : 'Tod.')
                : date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' });

            return (
              <g key={i}>
                {/* Bar background */}
                <rect x={x} y={0} width={barWidth} height={chartHeight} rx={8} fill="#f8fafc" />
                {/* Bar fill */}
                <rect x={x} y={y} width={barWidth} height={barH} rx={8} fill={color} opacity={isToday ? 1 : 0.75} />
                {/* Value label — inside bar if bar is tall, above if short */}
                <text
                  x={x + barWidth / 2}
                  y={barH >= 18 ? y + 13 : y - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="900"
                  fill={barH >= 18 ? '#fff' : (isToday ? color : '#94a3b8')}
                >
                  {val > 0 ? val : '—'}
                </text>
                {/* Day label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={isToday ? '#1e293b' : '#94a3b8'}
                >
                  {dayLabel}
                </text>
                {/* Today dot indicator */}
                {isToday && (
                  <circle cx={x + barWidth / 2} cy={chartHeight + 28} r={3} fill={color} />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Unit info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{metricLabels[metric]}</span>
        <span className="text-[8px] font-bold text-slate-300">•</span>
        <span className="text-[8px] font-bold text-slate-300">{lang === 'tr' ? 'Günlük ortalama' : 'Daily average'} · {metricUnits[metric]}</span>
        <span className="ml-auto text-[8px] font-bold text-slate-300">Open-Meteo</span>
      </div>

      {/* Color legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { color: '#10b981', label: lang === 'tr' ? 'İyi' : 'Good' },
          { color: '#f59e0b', label: lang === 'tr' ? 'Orta' : 'Moderate' },
          { color: '#f97316', label: lang === 'tr' ? 'Hassas' : 'Sensitive' },
          { color: '#ef4444', label: lang === 'tr' ? 'Sağlıksız' : 'Unhealthy' },
          { color: '#9333ea', label: lang === 'tr' ? 'Tehlikeli' : 'Hazardous' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[8px] font-bold text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AQIHistoryChart;
