import React, { useState } from 'react';

interface UVDay {
  avg: number;
  day: string;
  max: number;
  min: number;
}

interface UVIndexCardProps {
  uviForecast: UVDay[];
  lang: 'tr' | 'en';
}

const getUVLevel = (uvi: number) => {
  if (uvi <= 2)  return { label: { tr: 'Düşük', en: 'Low' },         color: 'emerald', spf: null,   icon: '🌤️' };
  if (uvi <= 5)  return { label: { tr: 'Orta', en: 'Moderate' },     color: 'yellow',  spf: 30,    icon: '☀️' };
  if (uvi <= 7)  return { label: { tr: 'Yüksek', en: 'High' },       color: 'orange',  spf: 50,    icon: '🌞' };
  if (uvi <= 10) return { label: { tr: 'Çok Yüksek', en: 'Very High' }, color: 'rose', spf: 50,    icon: '🔆' };
  return           { label: { tr: 'Aşırı', en: 'Extreme' },          color: 'purple',  spf: 50,    icon: '⚠️' };
};

const getTips = (uvi: number, lang: 'tr' | 'en') => {
  if (lang === 'tr') {
    if (uvi <= 2)  return ['Güneş koruması gerekmez', 'Dışarıda zaman geçirebilirsiniz'];
    if (uvi <= 5)  return ['SPF 30+ güneş kremi sürün', 'Öğle saatlerinde şapka takın'];
    if (uvi <= 7)  return ['SPF 50+ güneş kremi şart', 'Güneş gözlüğü ve şapka takın', '10:00–16:00 arasında gölgede kalın'];
    if (uvi <= 10) return ['SPF 50+ güneş kremi sürün', 'Koruyucu kıyafet giyin', '10:00–16:00 arasında dışarı çıkmayın'];
    return ['Maksimum koruma gerekli', 'Öğle saatlerinde kapalı alanda kalın', 'Tüm cildinizi kapatın'];
  } else {
    if (uvi <= 2)  return ['No protection needed', 'Enjoy time outdoors'];
    if (uvi <= 5)  return ['Apply SPF 30+ sunscreen', 'Wear a hat around midday'];
    if (uvi <= 7)  return ['SPF 50+ sunscreen essential', 'Wear sunglasses and a hat', 'Seek shade 10:00–16:00'];
    if (uvi <= 10) return ['Apply SPF 50+ sunscreen', 'Wear protective clothing', 'Avoid outdoors 10:00–16:00'];
    return ['Maximum protection required', 'Stay indoors at midday', 'Cover all exposed skin'];
  }
};

const colorMap: Record<string, { bg: string; light: string; text: string; ring: string; bar: string }> = {
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', bar: 'bg-emerald-400' },
  yellow:  { bg: 'bg-yellow-500',  light: 'bg-yellow-50',  text: 'text-yellow-700',  ring: 'ring-yellow-200',  bar: 'bg-yellow-400' },
  orange:  { bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200',  bar: 'bg-orange-400' },
  rose:    { bg: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    bar: 'bg-rose-400' },
  purple:  { bg: 'bg-purple-600',  light: 'bg-purple-50',  text: 'text-purple-700',  ring: 'ring-purple-200',  bar: 'bg-purple-500' },
};

// Map UV value (0-12+) to 0-100% for gauge
const uvToPercent = (uvi: number): number => Math.min(100, (uvi / 12) * 100);

const UVIndexCard: React.FC<UVIndexCardProps> = ({ uviForecast, lang }) => {
  if (!uviForecast || uviForecast.length === 0) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayData = uviForecast.find(d => d.day === today) ?? uviForecast[0];
  const upcomingDays = uviForecast.slice(0, 5);

  const [selectedDay, setSelectedDay] = useState<string>(todayData.day);
  const selectedData = upcomingDays.find(d => d.day === selectedDay) ?? todayData;
  const selectedUVI = selectedData.max;
  const isSelectedToday = selectedDay === today;

  const level = getUVLevel(selectedUVI);
  const c = colorMap[level.color];
  const tips = getTips(selectedUVI, lang);

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight">
          {lang === 'tr' ? 'UV İndeksi' : 'UV Index'}
        </h3>
        <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${c.light} ${c.text}`}>
          {isSelectedToday ? (lang === 'tr' ? 'Bugün' : 'Today') : new Date(selectedDay).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: Big value + gauge */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0 w-full md:w-auto">
          <div className={`w-32 h-32 rounded-full ${c.bg} text-white flex flex-col items-center justify-center shadow-xl ring-4 ${c.ring} transition-all duration-300`}>
            <span className="text-4xl font-black leading-none">{selectedUVI}</span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">UV Max</span>
          </div>

          <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${c.light} ${c.text}`}>
            {level.icon} {level.label[lang]}
          </div>

          {/* SPF badge */}
          {level.spf && (
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                {lang === 'tr' ? 'Önerilen SPF' : 'Recommended SPF'}
              </p>
              <p className="text-lg font-black">{level.spf}+</p>
            </div>
          )}
        </div>

        {/* Right: Gauge bar + tips + 5-day */}
        <div className="flex-1 w-full space-y-5">
          {/* UV Scale Gauge */}
          <div>
            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              <span>0</span>
              <span>3</span>
              <span>6</span>
              <span>8</span>
              <span>11+</span>
            </div>
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 via-rose-500 to-purple-600 relative shadow-inner">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-800 shadow-md transition-all duration-300"
                style={{ left: `calc(${uvToPercent(selectedUVI)}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[7px] font-bold text-emerald-500">{lang === 'tr' ? 'Düşük' : 'Low'}</span>
              <span className="text-[7px] font-bold text-purple-600">{lang === 'tr' ? 'Aşırı' : 'Extreme'}</span>
            </div>
          </div>

          {/* Protection Tips */}
          <div className={`${c.light} rounded-2xl p-4 border border-current/10`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${c.text}`}>
              {lang === 'tr' ? 'Koruma Önerileri' : 'Protection Tips'}
            </p>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.bg} mt-1.5 flex-shrink-0`} />
                  <span className="text-[11px] font-bold text-slate-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 5-Day UV Forecast */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
              {lang === 'tr' ? '5 Günlük UV' : '5-Day UV'}
            </p>
            <div className="flex gap-2">
              {upcomingDays.map((d, i) => {
                const lv = getUVLevel(d.max);
                const dc = colorMap[lv.color];
                const isDayToday = d.day === today;
                const date = new Date(d.day);
                const dayName = isDayToday
                  ? (lang === 'tr' ? 'Bugün' : 'Today')
                  : date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' });
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(d.day)}
                    className={`flex-1 rounded-2xl p-2.5 text-center border transition-all active:scale-95 ${
                      selectedDay === d.day
                        ? `${dc.light} ${dc.text} border-current/20 ring-2 ring-offset-1 ${dc.ring}`
                        : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <p className={`text-[8px] font-black uppercase ${selectedDay === d.day ? dc.text : 'text-slate-400'}`}>{dayName}</p>
                    <p className={`text-base font-black mt-0.5 ${selectedDay === d.day ? dc.text : 'text-slate-700'}`}>{d.max}</p>
                    <p className="text-[7px] font-bold text-slate-400">{lv.icon}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scale legend */}
      <div className="mt-5 bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
          {lang === 'tr' ? 'UV Skalası' : 'UV Scale'}
        </p>
        <div className="flex gap-1.5">
          {[
            { label: lang === 'tr' ? '0-2 Düşük' : '0-2 Low',       color: 'bg-emerald-400 text-white' },
            { label: lang === 'tr' ? '3-5 Orta' : '3-5 Mod',        color: 'bg-yellow-400 text-yellow-900' },
            { label: lang === 'tr' ? '6-7 Yüksek' : '6-7 High',     color: 'bg-orange-400 text-white' },
            { label: lang === 'tr' ? '8-10 Çok Y.' : '8-10 V.High', color: 'bg-rose-500 text-white' },
            { label: lang === 'tr' ? '11+ Aşırı' : '11+ Extreme',   color: 'bg-purple-600 text-white' },
          ].map((s, i) => (
            <div key={i} className={`flex-1 ${s.color} rounded-lg py-1.5 text-center`}>
              <span className="text-[7px] font-black leading-tight block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UVIndexCard;
