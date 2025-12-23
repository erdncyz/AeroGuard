
import React, { useState, useEffect, useCallback } from 'react';
import * as waqiService from './services/waqiService';
import { StationData, SearchResult, Language } from './types';
import { getAqiMetadata } from './constants';
import { translations, TURKEY_PROVINCES } from './translations';
import PollutantCard from './components/PollutantCard';
import AirMap from './components/AirMap';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('tr');
  const [loading, setLoading] = useState(true);
  const [stationData, setStationData] = useState<StationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapMode, setMapMode] = useState<'station' | 'heatmap'>('station');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [activeWidgetType, setActiveWidgetType] = useState<'classic' | 'wide' | 'detailed'>('classic');

  const t = translations[lang];

  const loadLocationData = useCallback(async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const data = await waqiService.fetchByGeo(pos.coords.latitude, pos.coords.longitude);
            setStationData(data);
            setLoading(false);
          },
          async () => {
            const data = await waqiService.fetchByIP();
            setStationData(data);
            setLoading(false);
          }
        );
      } else {
        const data = await waqiService.fetchByIP();
        setStationData(data);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocationData();
  }, [loadLocationData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await waqiService.searchStations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProvinceSelect = async (prov: string) => {
    setSelectedProvince(prov);
    if (!prov) return;
    setIsSearching(true);
    try {
      const results = await waqiService.searchStations(prov);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectStation = async (idx: number) => {
    setLoading(true);
    setSearchResults([]);
    setSearchQuery('');
    setMapMode('station');
    try {
      const data = await waqiService.fetchStationById(idx);
      setStationData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center px-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-slate-700">{t.checkingAir}</h2>
          <p className="text-slate-400 text-sm mt-1">{t.fetchingData}</p>
        </div>
      </div>
    );
  }

  const aqiMeta = stationData ? getAqiMetadata(stationData.aqi) : null;
  const aqiText = aqiMeta ? t.aqiLevels[aqiMeta.key] : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 sm:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-10">
        <header className="flex flex-col gap-6 mb-8 sm:mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {t.title} <span className="text-emerald-500">Pro</span>
                </h1>
                <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{t.subtitle}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest flex items-center gap-1.5"
            >
              <span className={lang === 'en' ? 'text-emerald-500' : ''}>EN</span>
              <span className="text-slate-200 font-normal">|</span>
              <span className={lang === 'tr' ? 'text-emerald-500' : ''}>TR</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-stretch sm:items-center gap-4">
             <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <button 
                  onClick={() => setShowWidgetModal(true)}
                  className="whitespace-nowrap px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest active:scale-95"
                >
                  {t.widget}
                </button>
                <button 
                  onClick={() => setShowDownloadModal(true)}
                  className="whitespace-nowrap px-4 py-2.5 bg-slate-900 border border-slate-900 rounded-xl text-[10px] font-black shadow-sm text-white hover:bg-black transition-all uppercase tracking-widest active:scale-95"
                >
                  {t.getApp}
                </button>
             </div>

             <div className="relative flex-1">
                <form onSubmit={handleSearch} className="relative z-[60]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </form>

                {searchResults.length > 0 && (
                  <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto overflow-x-hidden animate-in slide-in-from-top-2 duration-200">
                    {searchResults.map((res, index) => (
                      <button
                        key={res.uid}
                        onClick={() => selectStation(res.uid)}
                        className={`w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 border-slate-100 transition-colors text-left ${index !== searchResults.length - 1 ? 'border-b' : ''}`}
                      >
                        <div className="max-w-[75%]">
                          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{res.station.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-tight">{res.time.stime}</p>
                        </div>
                        <div className={`flex-shrink-0 min-w-[32px] text-center px-2 py-1 rounded-lg text-[10px] font-black ${getAqiMetadata(parseInt(res.aqi)).color} text-white shadow-sm`}>
                          {res.aqi}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </header>

        {stationData && (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
            <div className="lg:col-span-8 space-y-6">
              <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className={`absolute -top-10 -right-10 w-64 h-64 opacity-5 rounded-full ${aqiMeta?.color}`}></div>
                
                <div className="flex flex-col md:flex-row gap-8 sm:gap-12 items-center">
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full border-[12px] border-slate-50 flex flex-col items-center justify-center shadow-xl ${aqiMeta?.color} text-white relative transform hover:scale-105 transition-transform duration-300`}>
                      <span className="text-5xl sm:text-6xl font-black tracking-tighter">{stationData.aqi}</span>
                      <span className="text-[9px] uppercase font-black tracking-widest opacity-80 mt-1">{t.aqiIndex}</span>
                    </div>
                    <div className={`mt-5 px-6 py-2 rounded-2xl text-[10px] font-black text-white shadow-lg ${aqiMeta?.color} uppercase tracking-widest`}>
                      {aqiText?.label}
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">{stationData.city.name}</h2>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">{aqiText?.desc}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t.lastUpdate}</p>
                        <p className="text-xs font-bold text-slate-700">{new Date(stationData.time.iso).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t.dominantPollutant}</p>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-tight truncate">{stationData.dominentpol}</p>
                      </div>
                    </div>

                    <button 
                      onClick={loadLocationData}
                      className="w-full py-4 px-8 bg-slate-900 hover:bg-black text-white text-[10px] font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {t.useLocation}
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[2.5rem] p-3 sm:p-4 shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-4 px-3 py-2 gap-3">
                   <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{t.heatmap}</h3>
                   </div>
                   <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full sm:w-auto">
                      <button 
                        onClick={() => setMapMode('station')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${mapMode === 'station' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        {t.stationView.toUpperCase()}
                      </button>
                      <button 
                        onClick={() => setMapMode('heatmap')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${mapMode === 'heatmap' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        {t.heatmap.toUpperCase()}
                      </button>
                   </div>
                </div>
                <div className="h-[450px] sm:h-[550px] w-full">
                  <AirMap mode={mapMode} geo={stationData.city.geo} aqi={stationData.aqi} label={stationData.city.name} translations={t} />
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                 <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 leading-none">{t.browseTurkey}</h3>
                 <div className="relative">
                   <select 
                     value={selectedProvince}
                     onChange={(e) => handleProvinceSelect(e.target.value)}
                     className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none appearance-none pr-10 cursor-pointer"
                   >
                     <option value="">{t.selectProvince}</option>
                     {TURKEY_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                     </svg>
                   </div>
                 </div>
              </section>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-3">
                   <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{t.pollutantBreakdown}</h3>
                   <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase tracking-tighter">{t.live}</span>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 px-1 sm:px-0">
                  <PollutantCard label="PM 2.5" value={stationData.iaqi.pm25?.v} unit="µg/m³" description={t.pm25Desc} />
                  <PollutantCard label="PM 10" value={stationData.iaqi.pm10?.v} unit="µg/m³" description={t.pm10Desc} />
                  <PollutantCard label="Ozon (O₃)" value={stationData.iaqi.o3?.v} unit="ppb" description={t.o3Desc} />
                  <PollutantCard label="Azot (NO₂)" value={stationData.iaqi.no2?.v} unit="ppb" description={t.no2Desc} />
                </div>

                <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:rotate-12 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6">{t.conditions}</h4>
                  <div className="space-y-4">
                    {[
                      { label: t.temp, value: `${stationData.iaqi.t?.v ?? '—'}°C`, color: 'text-sky-400' },
                      { label: t.hum, value: `${stationData.iaqi.h?.v ?? '—'}%`, color: 'text-emerald-400' },
                      { label: t.press, value: `${stationData.iaqi.p?.v ?? '—'} hPa`, color: 'text-indigo-400' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.label}</span>
                        <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

        <footer className="mt-10 py-8 border-t border-slate-200/60 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t.developedBy}{' '}
            <a 
              href="https://erdincyilmaz.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-emerald-500 transition-colors duration-200 underline decoration-slate-300 decoration-2 underline-offset-4"
            >
              Erdinç Yılmaz
            </a>
          </p>
        </footer>

        {showDownloadModal && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative animate-in slide-in-from-bottom duration-300 pb-safe">
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 sm:hidden"></div>
              <button onClick={() => setShowDownloadModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 hidden sm:block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="text-center">
                <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">{t.downloadTitle}</h3>
                <div className="space-y-4 text-left">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Android / Chrome</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{t.downloadDescAndroid}</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase mb-2 tracking-widest">iOS / Safari</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{t.downloadDesciOS}</p>
                  </div>
                </div>
                <button onClick={() => setShowDownloadModal(false)} className="w-full mt-8 py-4.5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-transform">{t.close}</button>
              </div>
            </div>
          </div>
        )}

        {showWidgetModal && stationData && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative animate-in slide-in-from-bottom duration-300 pb-safe">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
              <h3 className="text-2xl font-black text-slate-800 mb-1 tracking-tight text-center sm:text-left">{t.widgetTitle}</h3>
              <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-widest text-center sm:text-left">{t.widgetDesc}</p>
              
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                {(['classic', 'wide', 'detailed'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveWidgetType(type)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      activeWidgetType === type 
                        ? 'bg-white shadow-sm text-slate-900 scale-100' 
                        : 'text-slate-400 hover:text-slate-600 scale-95'
                    }`}
                  >
                    {t.widgetTypes[type]}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 p-8 rounded-[3.5rem] border-4 border-slate-100 shadow-inner flex flex-col items-center justify-center mb-6 min-h-[260px] relative">
                 {activeWidgetType === 'classic' && (
                   <div className={`w-40 h-40 rounded-[2.5rem] p-6 flex flex-col justify-between shadow-2xl ${aqiMeta?.color} text-white animate-in zoom-in duration-300`}>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black opacity-90 uppercase tracking-[0.1em]">AEROGUARD</span>
                         <div className="w-2.5 h-2.5 rounded-full bg-white opacity-40 shadow-inner"></div>
                      </div>
                      <div className="text-center py-2">
                         <span className="text-5xl font-black block tracking-tighter leading-[1]">{stationData.aqi}</span>
                         <span className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em] mt-1 block">AQI</span>
                      </div>
                      <div className="bg-white/25 rounded-2xl py-2 px-3 text-center backdrop-blur-md border border-white/10">
                         <span className="text-[9px] font-black uppercase tracking-[0.2em]">{aqiText?.label}</span>
                      </div>
                   </div>
                 )}

                 {activeWidgetType === 'wide' && (
                    <div className={`w-full max-w-[280px] h-28 rounded-[1.75rem] p-5 flex items-center justify-between shadow-xl ${aqiMeta?.color} text-white animate-in zoom-in duration-300`}>
                      <div className="flex flex-col justify-center border-r border-white/20 pr-5">
                        <span className="text-3xl font-black leading-tight tracking-tighter">{stationData.aqi}</span>
                        <span className="text-[9px] font-black opacity-80 uppercase tracking-widest">AQI</span>
                      </div>
                      <div className="flex-1 px-5 overflow-hidden">
                        <p className="text-xs font-black truncate tracking-tight">{stationData.city.name}</p>
                        <p className="text-[9px] font-black opacity-80 uppercase tracking-[0.15em] mt-0.5">{aqiText?.label}</p>
                      </div>
                      <div className="bg-white/20 rounded-2xl p-2.5 text-center backdrop-blur-sm border border-white/10">
                        <span className="text-xl font-black leading-none">{stationData.iaqi.t?.v ?? '--'}°</span>
                      </div>
                    </div>
                 )}

                 {activeWidgetType === 'detailed' && (
                    <div className={`w-48 aspect-square rounded-[2.25rem] p-5 flex flex-col shadow-2xl ${aqiMeta?.color} text-white animate-in zoom-in duration-300`}>
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex flex-col">
                            <span className="text-2xl font-black leading-none tracking-tighter">{stationData.aqi}</span>
                            <span className="text-[8px] font-black uppercase opacity-90 tracking-widest">{aqiText?.label}</span>
                         </div>
                         <div className="bg-white/20 rounded-xl px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest border border-white/10">{stationData.dominentpol}</div>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2 border border-white/5">
                          <span className="text-[8px] font-black uppercase opacity-80 tracking-widest">PM2.5</span>
                          <span className="text-xs font-black">{stationData.iaqi.pm25?.v ?? '--'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2 border border-white/5">
                          <span className="text-[8px] font-black uppercase opacity-80 tracking-widest">PM10</span>
                          <span className="text-xs font-black">{stationData.iaqi.pm10?.v ?? '--'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2 border border-white/5">
                          <span className="text-[8px] font-black uppercase opacity-80 tracking-widest">TEMP</span>
                          <span className="text-xs font-black">{stationData.iaqi.t?.v ?? '--'}°C</span>
                        </div>
                      </div>
                    </div>
                 )}
              </div>

              <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="p-1 bg-emerald-100 text-emerald-600 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  {t.widgetHowToTitle}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  {t.widgetHowToDesc}
                </p>
              </div>

              <button onClick={() => setShowWidgetModal(false)} className="w-full py-4.5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest active:scale-95 transition-transform shadow-lg">{t.close}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
