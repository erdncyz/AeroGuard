import React, { useState } from 'react';
import { DailyAQIHistory } from '../services/aqiHistoryService';

interface AQIHistoryChartProps {
  history: DailyAQIHistory[];
  lang: 'tr' | 'en';
  uviForecast?: Array<number | { max?: number; day?: string }>;
}

type Metric = 'pm25' | 'pm10' | 'o3';

const metricLabels: Record<Metric, string> = { pm25: 'PM2.5', pm10: 'PM10', o3: 'O₃' };
const isValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const AQIHistoryChart: React.FC<AQIHistoryChartProps> = ({ history, lang }) => {
  const [metric, setMetric] = useState<Metric>('pm25');
  const formatValue = (value: number) => value.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { maximumFractionDigits: 1 });
  if (!history?.length) return null;

  const values = history.map(day => isValue(day[metric]) ? day[metric] : null);
  const availableValues = values.filter(isValue);
  const maxValue = Math.max(...availableValues, 1);
  // Missing days must not become zero or imply that pollution has improved.
  const canShowTrend = values.length >= 2 && availableValues.length === values.length;
  const half = Math.floor(values.length / 2);
  const mean = (data: number[]) => data.reduce((sum, value) => sum + value, 0) / data.length;
  const change = canShowTrend ? mean(availableValues.slice(half)) - mean(availableValues.slice(0, half)) : null;
  const trend = change === null ? null : change < 0
    ? (lang === 'tr' ? 'Azalıyor' : 'Decreasing')
    : change > 0 ? (lang === 'tr' ? 'Artıyor' : 'Increasing') : (lang === 'tr' ? 'Sabit' : 'Stable');

  const barWidth = 28;
  const gap = 12;
  const chartHeight = 120;
  const topPadding = 18;
  const svgWidth = Math.max(history.length * (barWidth + gap) - gap, barWidth);

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-sm font-black text-slate-900 tracking-tight">
          {lang === 'tr' ? 'Son 7 Gün · Model Geçmişi' : 'Past 7 Days · Model History'}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {(['pm25', 'pm10', 'o3'] as Metric[]).map(key => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`px-4 py-2.5 text-[10px] font-black rounded-xl transition-all border ${
                metric === key ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {metricLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        {lang === 'tr'
          ? 'Open-Meteo / CAMS arşivlenmiş model tahminlerinin günlük ortalama konsantrasyonu. İstasyon ölçümü veya AQI değildir; bu ortalamalardan güncel sağlık önerisi çıkarılmaz.'
          : 'Daily mean concentration from archived Open-Meteo / CAMS model forecasts. These are not station observations or AQI and do not establish current health advice.'}
      </p>
      {trend && (
        <p className="inline-flex px-3 py-1.5 mb-4 text-[10px] font-bold text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
          {lang === 'tr' ? 'Konsantrasyon eğilimi: ' : 'Concentration trend: '}{trend}
        </p>
      )}
      {!availableValues.length && (
        <p className="text-sm text-slate-500 mb-3">{lang === 'tr' ? 'Bu kirletici için geçmiş verisi yok.' : 'No history available for this pollutant.'}</p>
      )}

      <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
        <svg
          viewBox={`0 0 ${svgWidth} ${topPadding + chartHeight + 45}`}
          width={Math.max(svgWidth, 280)}
          height={topPadding + chartHeight + 45}
          className="overflow-visible"
          role="img"
          aria-label={`${metricLabels[metric]} ${lang === 'tr' ? 'günlük ortalama konsantrasyon, mikrogram/metreküp' : 'daily mean concentration, micrograms per cubic metre'}`}
        >
          {history.map((day, index) => {
            const value = values[index];
            const hasValue = value !== null;
            const barHeight = hasValue ? (value / maxValue) * chartHeight : 0;
            const x = index * (barWidth + gap);
            const y = topPadding + chartHeight - barHeight;
            // Date-only strings are calendar days, not UTC instants.
            const date = new Date(day.date + 'T12:00:00');
            const dayLabel = Number.isFinite(date.getTime())
              ? date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short', day: 'numeric' })
              : day.date;
            return (
              <g key={day.date}>
                <title>{`${day.date}: ${hasValue ? `${formatValue(value)} µg/m³` : (lang === 'tr' ? 'Veri yok' : 'No data')}`}</title>
                <rect x={x} y={topPadding} width={barWidth} height={chartHeight} rx={8} fill="#f8fafc" />
                {hasValue && value > 0 && (
                  <rect x={x} y={y} width={barWidth} height={barHeight} rx={8} fill="#3b82f6" />
                )}
                <text
                  x={x + barWidth / 2}
                  y={barHeight >= 18 ? y + 13 : Math.max(y - 4, topPadding + 9)}
                  textAnchor="middle" fontSize="9" fontWeight="900"
                  fill={barHeight >= 18 ? '#fff' : '#64748b'}
                >
                  {hasValue ? formatValue(value) : '—'}
                </text>
                <text x={x + barWidth / 2} y={topPadding + chartHeight + 18} textAnchor="middle" fontSize="8" fontWeight="700" fill="#64748b">
                  {dayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-500">
        <span>{metricLabels[metric]} · {lang === 'tr' ? 'Günlük ortalama' : 'Daily mean'} · µg/m³</span>
        <span className="ml-auto">{lang === 'tr' ? '— Veri yok' : '— No data'} · Open-Meteo / CAMS</span>
      </div>
    </section>
  );
};

export default AQIHistoryChart;
