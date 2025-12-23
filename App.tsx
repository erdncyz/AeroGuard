
import React, { useState, useEffect, useCallback } from 'react';
import * as waqiService from './services/waqiService';
import { StationData, SearchResult, Language } from './types';
import { getAqiMetadata } from './constants';
import { translations, TURKEY_PROVINCES, COUNTRIES } from './translations';
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
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [cleanestRegion, setCleanestRegion] = useState<SearchResult | null>(null);
  const [mostPollutedRegion, setMostPollutedRegion] = useState<SearchResult | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [activeWidgetType, setActiveWidgetType] = useState<'classic' | 'wide' | 'detailed'>('classic');

  const t = translations[lang];

  // Uygulama başlangıcında cache temizleme ve error handling
  useEffect(() => {
    try {
      // localStorage'da sorunlu veri varsa temizle
      const checkAndClearCache = () => {
        try {
          // Test için localStorage'ı oku
          const testKey = '__aeroguard_test__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
        } catch (e) {
          // localStorage erişim hatası, temizle
          console.warn('localStorage temizleniyor...');
          try {
            localStorage.clear();
          } catch (clearErr) {
            console.error('localStorage temizlenemedi:', clearErr);
          }
        }
      };

      checkAndClearCache();
    } catch (err) {
      console.error('Cache kontrolü hatası:', err);
    }
  }, []);

  const loadLocationData = useCallback(async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const data = await waqiService.fetchByGeo(pos.coords.latitude, pos.coords.longitude);
              setStationData(data);
            } catch (err) {
              console.error('Geo veri hatası:', err);
              // Hata durumunda IP'ye geç
              const data = await waqiService.fetchByIP();
              setStationData(data);
            } finally {
              setLoading(false);
            }
          },
          async () => {
            try {
              const data = await waqiService.fetchByIP();
              setStationData(data);
            } catch (err) {
              console.error('IP veri hatası:', err);
            } finally {
              setLoading(false);
            }
          }
        );
      } else {
        try {
          const data = await waqiService.fetchByIP();
          setStationData(data);
        } catch (err) {
          console.error('Veri yükleme hatası:', err);
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Konum yükleme hatası:', err);
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
    if (!prov) return;
    setLoading(true);
    try {
      const results = await waqiService.searchStations(prov);
      if (results.length > 0) {
        // Otomatik olarak ilk sonucu seç
        const data = await waqiService.fetchStationById(results[0].uid);
        setStationData(data);
        setMapMode('station');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const section = document.getElementById('educational-section');
                  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest active:scale-95"
              >
                {t.about}
              </button>
              <button
                onClick={() => setShowWidgetModal(true)}
                className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest active:scale-95"
              >
                {t.widget}
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="whitespace-nowrap px-4 py-2 bg-slate-900 border border-slate-900 rounded-xl text-[10px] font-black shadow-sm text-white hover:bg-black transition-all uppercase tracking-widest active:scale-95"
              >
                {t.getApp}
              </button>
              <button
                onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest flex items-center gap-1.5"
              >
                <span className={lang === 'en' ? 'text-emerald-500' : ''}>EN</span>
                <span className="text-slate-200 font-normal">|</span>
                <span className={lang === 'tr' ? 'text-emerald-500' : ''}>TR</span>
              </button>
            </div>
          </div>
        </header>


        {/* Cascade Location Selection */}
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">{t.browseWorld}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Country Selection */}
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t.selectCountry}</label>
              <select
                value={selectedCountry}
                onChange={async (e) => {
                  const country = e.target.value;
                  setSelectedCountry(country);
                  setSelectedProvince('');
                  setSelectedDistrict('');
                  setAvailableCities([]);
                  setAvailableDistricts([]);

                  // Ülke seçildiğinde şehirleri yükle
                  if (country) {
                    try {
                      const results = await waqiService.searchStations(country);

                      if (country === 'Turkey') {
                        // Türkiye için hazır liste kullan
                        setAvailableCities(TURKEY_PROVINCES);
                      } else {
                        // Diğer ülkeler için API'den şehirleri çıkar
                        const cities = results
                          .map(r => {
                            const parts = r.station.name.split(',');
                            // İkinci parça genellikle şehir
                            return parts[1]?.trim() || parts[0]?.trim();
                          })
                          .filter((c, i, arr) => c && arr.indexOf(c) === i)
                          .sort();
                        setAvailableCities(cities);
                      }

                      // En temiz ve en kirli bölgeleri bul
                      if (results.length > 0) {
                        const sorted = [...results].sort((a, b) => parseInt(a.aqi) - parseInt(b.aqi));
                        setCleanestRegion(sorted[0]); // En düşük AQI = En temiz
                        setMostPollutedRegion(sorted[sorted.length - 1]); // En yüksek AQI = En kirli
                      }
                    } catch (err) {
                      console.error('Şehirler yüklenemedi:', err);
                    }
                  } else {
                    setCleanestRegion(null);
                    setMostPollutedRegion(null);
                  }
                }}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none appearance-none pr-10 cursor-pointer hover:border-emerald-200 transition-colors"
              >
                <option value="">-</option>
                {COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
              </select>
              <div className="absolute right-4 bottom-4 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Province Selection */}
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{selectedCountry === 'Turkey' ? t.selectProvince : t.selectCity}</label>
              <select
                value={selectedProvince}
                onChange={async (e) => {
                  const province = e.target.value;
                  setSelectedProvince(province);
                  setSelectedDistrict('');
                  setAvailableDistricts([]);

                  // İl seçildiğinde ilçeleri yükle
                  if (province) {
                    try {
                      const results = await waqiService.searchStations(province);
                      // Sonuçlardan benzersiz ilçe isimlerini çıkar
                      const districts = results
                        .map(r => {
                          const parts = r.station.name.split(',');
                          return parts[0]?.trim();
                        })
                        .filter((d, i, arr) => d && arr.indexOf(d) === i)
                        .sort();
                      setAvailableDistricts(districts);
                    } catch (err) {
                      console.error('İlçeler yüklenemedi:', err);
                    }
                  }
                }}
                disabled={!selectedCountry || availableCities.length === 0}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none appearance-none pr-10 cursor-pointer hover:border-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-</option>
                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
              <div className="absolute right-4 bottom-4 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* District Selection */}
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t.selectDistrict}</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedProvince || availableDistricts.length === 0}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none appearance-none pr-10 cursor-pointer hover:border-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-</option>
                {availableDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <div className="absolute right-4 bottom-4 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  const searchTerm = selectedDistrict || selectedProvince || selectedCountry;
                  if (searchTerm) {
                    handleProvinceSelect(searchTerm);
                  }
                }}
                disabled={!selectedCountry}
                className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white text-sm font-black rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {lang === 'tr' ? 'ARA' : 'SEARCH'}
              </button>
            </div>
          </div>
        </section>

        {/* Cleanest & Most Polluted Regions */}
        {(cleanestRegion || mostPollutedRegion) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Cleanest Region */}
            {cleanestRegion && (
              <div
                onClick={() => selectStation(cleanestRegion.uid)}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] p-6 sm:p-8 border border-emerald-100 cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t.cleanestRegion}</p>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">{cleanestRegion.station.name}</h3>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className={`text-4xl font-black ${getAqiMetadata(parseInt(cleanestRegion.aqi)).color.replace('bg-', 'text-')}`}>
                    {cleanestRegion.aqi}
                  </div>
                  <div className="text-sm font-bold text-slate-600">AQI</div>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">{cleanestRegion.time.stime}</p>
              </div>
            )}

            {/* Most Polluted Region */}
            {mostPollutedRegion && (
              <div
                onClick={() => selectStation(mostPollutedRegion.uid)}
                className="bg-gradient-to-br from-red-50 to-orange-50 rounded-[2.5rem] p-6 sm:p-8 border border-red-100 cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-500 p-3 rounded-2xl shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{t.mostPolluted}</p>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors">{mostPollutedRegion.station.name}</h3>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className={`text-4xl font-black ${getAqiMetadata(parseInt(mostPollutedRegion.aqi)).color.replace('bg-', 'text-')}`}>
                    {mostPollutedRegion.aqi}
                  </div>
                  <div className="text-sm font-bold text-slate-600">AQI</div>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">{mostPollutedRegion.time.stime}</p>
              </div>
            )}
          </section>
        )}

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

        {/* Educational Section */}
        <section id="educational-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-10 scroll-mt-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t.learnMore}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">{t.whyItMatters}</h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed font-medium">{t.whyItMattersDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Health Impacts */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-[2.5rem] p-8 border border-red-100">
              <div className="bg-red-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{t.healthImpacts}</h3>
              <p className="text-slate-700 leading-relaxed font-medium">{t.healthImpactsDesc}</p>
            </div>

            {/* How Measured */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] p-8 border border-blue-100">
              <div className="bg-blue-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{t.howMeasured}</h3>
              <p className="text-slate-700 leading-relaxed font-medium">{t.howMeasuredDesc}</p>
            </div>
          </div>

          {/* AQI Scale */}
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 mb-12">
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-3">
              <span className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
              {t.aqiExplained}
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">{t.aqiExplainedDesc}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { range: '0-50', label: t.aqiLevels.good.label, color: 'bg-emerald-500' },
                { range: '51-100', label: t.aqiLevels.moderate.label, color: 'bg-yellow-500' },
                { range: '101-150', label: t.aqiLevels.sensitive.label, color: 'bg-orange-500' },
                { range: '151-200', label: t.aqiLevels.unhealthy.label, color: 'bg-red-500' },
                { range: '201-300', label: t.aqiLevels.veryUnhealthy.label, color: 'bg-purple-500' },
                { range: '300+', label: t.aqiLevels.hazardous.label, color: 'bg-rose-900' }
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`${item.color} text-white py-3 px-2 rounded-2xl mb-2 shadow-lg`}>
                    <div className="text-lg font-black">{item.range}</div>
                  </div>
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pollutants */}
          <div className="mb-12">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight text-center">{t.pollutantsTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: t.pm25Title, info: t.pm25Info, icon: '🔬', color: 'from-purple-50 to-pink-50', borderColor: 'border-purple-100' },
                { title: t.pm10Title, info: t.pm10Info, icon: '💨', color: 'from-blue-50 to-cyan-50', borderColor: 'border-blue-100' },
                { title: t.o3Title, info: t.o3Info, icon: '☀️', color: 'from-yellow-50 to-orange-50', borderColor: 'border-yellow-100' },
                { title: t.no2Title, info: t.no2Info, icon: '🚗', color: 'from-red-50 to-rose-50', borderColor: 'border-red-100' }
              ].map((pollutant, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${pollutant.color} rounded-[2rem] p-6 border ${pollutant.borderColor}`}>
                  <div className="text-4xl mb-4">{pollutant.icon}</div>
                  <h4 className="text-sm font-black text-slate-900 mb-3 tracking-tight">{pollutant.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{pollutant.info}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Protection Tips */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl mb-12">
            <h3 className="text-2xl font-black mb-6 tracking-tight flex items-center gap-3">
              <span className="bg-white/20 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              {t.protectYourself}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[t.protectTip1, t.protectTip2, t.protectTip3, t.protectTip4, t.protectTip5].map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                  <div className="bg-white/20 rounded-full p-1.5 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Source */}
          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 text-center">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t.dataSource}</h4>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto">{t.dataSourceDesc}</p>
          </div>
        </section>

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
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeWidgetType === type
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
