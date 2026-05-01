
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as waqiService from './services/waqiService';
import { NearbyStation } from './services/waqiService';
import { StationData, SearchResult, Language } from './types';
import { getAqiMetadata } from './constants';
import { translations, TURKEY_PROVINCES, COUNTRIES } from './translations';
import PollutantCard from './components/PollutantCard';
import PollenCard from './components/PollenCard';
import AirMap from './components/AirMap';
import ForecastChart from './components/ForecastChart';
import AirQualityGames from './components/AirQualityGames';
import { shareWithImage } from './services/shareCardService';
import { fetchPollenData, PollenData } from './services/pollenService';
import { askHealthQuestion, getHealthAdvice, isGeminiConfigured, AIProvider } from './services/geminiService';
import { fetchAQIHistory, DailyAQIHistory } from './services/aqiHistoryService';
import AQIHistoryChart from './components/AQIHistoryChart';
import AppDownloadPage from './components/AppDownloadPage';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('tr');
  const [loading, setLoading] = useState(true);
  const [showAppDownloadPage, setShowAppDownloadPage] = useState(false);
  const [stationData, setStationData] = useState<StationData | null>(null);
  const [searchedStationData, setSearchedStationData] = useState<StationData | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapMode, setMapMode] = useState<'station' | 'heatmap'>('station');
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('Turkey');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [pollenData, setPollenData] = useState<PollenData | null>(null);
  const [searchedPollenData, setSearchedPollenData] = useState<PollenData | null>(null);
  const [aqiHistory, setAqiHistory] = useState<DailyAQIHistory[]>([]);
  const [healthAdvice, setHealthAdvice] = useState('');
  const [healthAdviceLoading, setHealthAdviceLoading] = useState(false);
  const [healthAdviceProvider, setHealthAdviceProvider] = useState<AIProvider>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiAnswerProvider, setAiAnswerProvider] = useState<AIProvider>(null);
  const [aiQuestionLoading, setAiQuestionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('section-aqi');
  const navRef = useRef<HTMLDivElement>(null);


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

  // Hash-based routing for download page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setShowAppDownloadPage(hash === 'download' || hash === 'apps');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
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

  const loadCountryData = useCallback(async (country: string) => {
    if (!country) {
      setAvailableCities([]);
      setAvailableDistricts([]);
      return;
    }

    try {
      const results = await waqiService.searchStations(country);

      if (country === 'Turkey') {
        // Turkiye icin hazir liste kullan
        setAvailableCities(TURKEY_PROVINCES);
      } else {
        // Diger ulkeler icin API'den sehirleri cikar
        const cities = results
          .map(r => {
            const parts = r.station.name.split(',');
            return parts[1]?.trim() || parts[0]?.trim();
          })
          .filter((c, i, arr) => c && arr.indexOf(c) === i)
          .sort();
        setAvailableCities(cities);
      }

    } catch (err) {
      console.error('Sehirler yuklenemedi:', err);
    }
  }, []);

  useEffect(() => {
    loadLocationData();
    loadCountryData('Turkey');

    // Loading timeout - 8 saniye sonra yine de UI'i goster
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - UI gosteriliyor');
        setLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loadLocationData, loadCountryData]);

  // Fetch nearby stations and pollen data when stationData changes
  useEffect(() => {
    if (stationData?.city?.geo) {
      const [lat, lng] = stationData.city.geo;
      waqiService.fetchNearbyStations(lat, lng, 6).then((stations) => {
        // Exclude the current station itself
        setNearbyStations(stations.filter(s => s.distance > 0.5));
      }).catch(() => setNearbyStations([]));

      // Fetch pollen data from Open-Meteo
      fetchPollenData(lat, lng)
        .then(res => setPollenData(res.current))
        .catch(() => setPollenData(null));

      // Fetch 7-day AQI history from Open-Meteo
      fetchAQIHistory(lat, lng)
        .then(history => setAqiHistory(history))
        .catch(() => setAqiHistory([]));
    }
  }, [stationData]);

  // Generate AI health advice for current location data
  useEffect(() => {
    let isCancelled = false;

    const generateAdvice = async () => {
      if (!stationData) {
        setHealthAdviceLoading(false);
        setHealthAdvice('');
        return;
      }

      if (!isGeminiConfigured()) {
        setHealthAdviceLoading(false);
        setHealthAdvice(
          lang === 'tr'
            ? 'AI sağlık önerileri için .env dosyasına VITE_GEMINI_API_KEY ekleyin.'
            : 'Add VITE_GEMINI_API_KEY to your .env file to enable AI health advice.'
        );
        return;
      }

      setHealthAdviceLoading(true);
      const { text: advice, provider } = await getHealthAdvice(stationData, lang);

      if (!isCancelled) {
        setHealthAdvice(advice);
        setHealthAdviceProvider(provider);
        setHealthAdviceLoading(false);
      }
    };

    generateAdvice().catch(() => {
      if (!isCancelled) {
        setHealthAdviceLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [stationData, lang]);

  // Scroll-spy: detect which section is in view
  useEffect(() => {
    const sectionIds = ['section-aqi', 'section-ai', 'section-forecast', 'section-history', 'section-pollen', 'section-explore', 'section-nearby', 'section-map', 'section-games', 'section-learn'];
    const visibleSections = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        }
        // Pick the last visible section in document order
        let active = '';
        for (const id of sectionIds) {
          if (visibleSections.has(id)) {
            active = id;
          }
        }
        if (active) setActiveSection(active);
      },
      { rootMargin: '-100px 0px -30% 0px', threshold: [0, 0.1, 0.3] }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [stationData, nearbyStations]);

  // Auto-scroll nav tabs to show the active tab
  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector(`[data-section="${activeSection}"]`) as HTMLElement;
    if (activeBtn) {
      const container = navRef.current;
      const scrollLeft = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeSection]);

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
    setSearchLoading(true);
    setSearchedStationData(null);
    setSearchedPollenData(null);
    try {
      const results = await waqiService.searchStations(prov);
      if (results.length > 0) {
        const data = await waqiService.fetchStationById(results[0].uid);
        setSearchedStationData(data);
        // Fetch pollen for searched location
        if (data.city?.geo) {
          fetchPollenData(data.city.geo[0], data.city.geo[1])
            .then(res => setSearchedPollenData(res.current))
            .catch(() => setSearchedPollenData(null));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectStation = async (idx: number) => {
    setSearchLoading(true);
    setSearchedStationData(null);
    setSearchedPollenData(null);
    setSearchResults([]);
    setSearchQuery('');
    try {
      const data = await waqiService.fetchStationById(idx);
      setSearchedStationData(data);
      if (data.city?.geo) {
        fetchPollenData(data.city.geo[0], data.city.geo[1])
          .then(res => setSearchedPollenData(res.current))
          .catch(() => setSearchedPollenData(null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAskAi = async () => {
    if (!stationData || aiQuestionLoading) return;

    if (!isGeminiConfigured()) {
      setAiAnswer(
        lang === 'tr'
          ? 'AI soru-cevap icin .env dosyasina VITE_GEMINI_API_KEY ekleyin.'
          : 'Add VITE_GEMINI_API_KEY to your .env file to enable AI Q&A.'
      );
      return;
    }

    if (!aiQuestion.trim()) {
      setAiAnswer(lang === 'tr' ? 'Lutfen bir soru yazin.' : 'Please enter a question.');
      return;
    }

    setAiQuestionLoading(true);
    const { text: answer, provider: answerProvider } = await askHealthQuestion(stationData, aiQuestion, lang);
    setAiAnswer(answer);
    setAiAnswerProvider(answerProvider);
    setAiQuestionLoading(false);
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

  // Show download page if hash is #download or #apps
  if (showAppDownloadPage) {
    return <AppDownloadPage lang={lang} />;
  }

  const aqiMeta = stationData ? getAqiMetadata(stationData.aqi) : null;
  const aqiText = aqiMeta ? t.aqiLevels[aqiMeta.key] : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-safe">
      <div className="max-w-7xl mx-auto px-safe">
        {/* Sticky Header + Navigation */}
        <div className="sticky top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 sticky-header-safe">
          <header className="flex items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <div className="bg-emerald-500 text-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-200 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-none truncate">
                  {t.title} <span className="text-emerald-500">Pro</span>
                </h1>
                <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold mt-0.5 uppercase tracking-wider truncate">{t.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                aria-label="Change language"
              >
                <span className="text-sm">{lang === 'tr' ? '🇹🇷' : '🇬🇧'}</span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{lang === 'tr' ? 'TR' : 'EN'}</span>
              </button>

              {/* Download App Button */}
              <button
                onClick={() => window.location.hash = 'download'}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl transition-all active:scale-95 shadow-sm"
                aria-label="Download app"
              >
                <span className="text-sm">📱</span>
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">{lang === 'tr' ? 'İNDİR' : 'DOWNLOAD'}</span>
              </button>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="relative">
            <div ref={navRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 pr-6" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {[
                { id: 'section-aqi', label: lang === 'tr' ? 'Hava Kalitesi' : 'Air Quality' },
                { id: 'section-ai', label: lang === 'tr' ? 'AI Sor' : 'Ask AI' },
                { id: 'section-forecast', label: lang === 'tr' ? 'Tahmin & UV' : 'Forecast & UV' },
                { id: 'section-history', label: lang === 'tr' ? 'Geçmiş' : 'History' },
                { id: 'section-pollen', label: lang === 'tr' ? 'Polen' : 'Pollen' },
                { id: 'section-explore', label: lang === 'tr' ? 'Şehir Ara' : 'Search City' },
                { id: 'section-nearby', label: lang === 'tr' ? 'Yakın İstasyonlar' : 'Nearby Stations' },
                { id: 'section-map', label: lang === 'tr' ? 'Harita' : 'Map' },
                { id: 'section-games', label: lang === 'tr' ? 'Oyunlar' : 'Games' },
                { id: 'section-learn', label: lang === 'tr' ? 'Bilgi' : 'Learn' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  data-section={tab.id}
                  onClick={() => {
                    const el = document.getElementById(tab.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap px-4 py-2 rounded-full transition-all flex-shrink-0 border ${
                    activeSection === tab.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 active:scale-95'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Scroll fade hint */}
            <div className="absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-[#f8fafc] to-transparent pointer-events-none"></div>
          </div>
        </div>

        <div className="h-4"></div>


        {stationData && (
          <main className="max-w-5xl mx-auto space-y-6 pb-10">
            <div className="space-y-6">
              <section id="section-aqi" className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-slate-100 relative overflow-hidden scroll-mt-safe">
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

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{t.pollutantBreakdown}</h3>
                        <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase tracking-tighter">{t.live}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <PollutantCard label="PM 2.5" value={stationData.iaqi.pm25?.v} unit="µg/m³" description={t.pm25Desc} />
                        <PollutantCard label="PM 10" value={stationData.iaqi.pm10?.v} unit="µg/m³" description={t.pm10Desc} />
                        <PollutantCard label="Ozon (O₃)" value={stationData.iaqi.o3?.v} unit="ppb" description={t.o3Desc} />
                        <PollutantCard label="Azot (NO₂)" value={stationData.iaqi.no2?.v} unit="ppb" description={t.no2Desc} />
                        {stationData.iaqi.co?.v !== undefined && (
                          <PollutantCard label="CO" value={stationData.iaqi.co.v} unit="ppm" description={t.coDesc} />
                        )}
                        {stationData.iaqi.so2?.v !== undefined && (
                          <PollutantCard label="SO₂" value={stationData.iaqi.so2.v} unit="ppb" description={t.so2Desc} />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[8px] font-bold">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-emerald-200"></div>
                          <span className="text-slate-500">{lang === 'tr' ? 'Güvenli' : 'Safe'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-yellow-200"></div>
                          <span className="text-slate-500">{lang === 'tr' ? 'Orta' : 'Moderate'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-orange-200"></div>
                          <span className="text-slate-500">{lang === 'tr' ? 'Hassas' : 'Sensitive'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-200"></div>
                          <span className="text-slate-500">{lang === 'tr' ? 'Sağlıksız' : 'Unhealthy'}</span>
                        </div>
                      </div>
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
                          { label: t.press, value: `${stationData.iaqi.p?.v ?? '—'} hPa`, color: 'text-indigo-400' },
                          { label: lang === 'tr' ? 'Rüzgar' : 'Wind', value: `${stationData.iaqi.w?.v ?? '—'} m/s`, color: 'text-cyan-400' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.label}</span>
                            <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div id="section-ai" className="bg-white rounded-[2rem] p-5 border border-emerald-100 shadow-sm scroll-mt-safe">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                          {lang === 'tr' ? 'AI Sağlık Önerisi' : 'AI Health Advice'}
                        </h4>
                        <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                            healthAdviceProvider === 'groq'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}>
                          {healthAdviceProvider === 'groq' ? 'Groq' : 'Gemini'}
                        </span>
                      </div>

                      {healthAdviceLoading ? (
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          {lang === 'tr' ? 'Öneri hazırlanıyor...' : 'Preparing advice...'}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                          {healthAdvice}
                        </p>
                      )}

                      <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                          {lang === 'tr' ? 'AI\'a Soru Sor' : 'Ask AI a Question'}
                        </label>
                        <textarea
                          value={aiQuestion}
                          onChange={(e) => setAiQuestion(e.target.value)}
                          rows={3}
                          placeholder={lang === 'tr' ? 'Ornek: Bugun disarida kosu yapmali miyim?' : 'Example: Is it safe to run outdoors today?'}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-emerald-300"
                        />
                        <button
                          onClick={handleAskAi}
                          disabled={aiQuestionLoading}
                          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest"
                        >
                          {aiQuestionLoading
                            ? (lang === 'tr' ? 'YANIT HAZIRLANIYOR...' : 'GENERATING ANSWER...')
                            : (lang === 'tr' ? 'SOR' : 'ASK')}
                        </button>

                        {!!aiAnswer && (
                          <div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium bg-emerald-50 border border-emerald-100 rounded-xl p-3 whitespace-pre-line">
                              {aiAnswer}
                            </p>
                            {aiAnswerProvider && (
                              <p className={`text-[8px] font-black mt-1.5 px-1 uppercase tracking-widest ${
                                aiAnswerProvider === 'groq' ? 'text-amber-500' : 'text-emerald-500'
                              }`}>
                                {aiAnswerProvider === 'groq' ? 'Groq · LLaMA 3.3' : 'Gemini 2.5 Flash'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={loadLocationData}
                        className="w-full py-4 px-8 bg-slate-900 hover:bg-black text-white text-[10px] font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        {t.useLocation}
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => shareWithImage({ stationData, levelLabel: aqiText?.label || '', lang })}
                        className="w-full py-4 px-8 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                        aria-label="Share"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        {lang === 'tr' ? 'PAYLAŞ' : 'SHARE'}
                      </button>

                      <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                          {lang === 'tr' ? 'Sensör bulunmayan bölgeler için en yakın istasyon verileri gösterilir.' : 'For areas without sensors, the nearest station data is displayed.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Forecast Chart */}
              {stationData.forecast && (
                <div id="section-forecast" className="scroll-mt-safe">
                  <ForecastChart forecast={stationData.forecast} lang={lang} />
                </div>
              )}

              {/* AQI History Chart */}
              {aqiHistory.length > 0 && (
                <div id="section-history" className="scroll-mt-safe">
                  <AQIHistoryChart history={aqiHistory} lang={lang} uviForecast={stationData.forecast?.daily?.uvi} />
                </div>
              )}

              {/* Pollen Forecast */}
              {pollenData && (
                <section id="section-pollen" className="scroll-mt-safe">
                  <PollenCard pollenData={pollenData} lang={lang} cityName={stationData.city.name} />
                </section>
              )}

              {/* Cascade Location Selection */}
              <section id="section-explore" className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100 scroll-mt-safe">
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

                        await loadCountryData(country);
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

                        // Il secildiginde ilceleri yukle
                        if (province) {
                          try {
                            const results = await waqiService.searchStations(province);
                            // Sonuclardan benzersiz ilce isimlerini cikar
                            const districts = results
                              .map(r => {
                                const parts = r.station.name.split(',');
                                return parts[0]?.trim();
                              })
                              .filter((d, i, arr) => d && arr.indexOf(d) === i)
                              .sort();
                            setAvailableDistricts(districts);
                          } catch (err) {
                            console.error('Ilceler yuklenemedi:', err);
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

                  {/* Search Loading Indicator */}
                  {searchLoading && (
                    <div className="col-span-full flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  {/* Searched Location Result */}
                  {searchedStationData && !searchLoading && (
                    <div className="col-span-full mt-6 animate-in slide-in-from-bottom duration-500">
                      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border border-emerald-100 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-[4rem] ${getAqiMetadata(searchedStationData.aqi).color}`}></div>

                        <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                          <div className="flex flex-col items-center">
                            <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg flex flex-col items-center justify-center ${getAqiMetadata(searchedStationData.aqi).color} text-white`}>
                              <span className="text-3xl font-black tracking-tighter">{searchedStationData.aqi}</span>
                              <span className="text-[7px] uppercase font-black tracking-widest opacity-80">AQI</span>
                            </div>
                          </div>

                          <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{searchedStationData.city.name}</h3>
                            <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 ${getAqiMetadata(searchedStationData.aqi).color.replace('bg-', 'bg-').replace('500', '100').replace('text-white', 'text-slate-700')} text-slate-600`}>
                              {t.aqiLevels[getAqiMetadata(searchedStationData.aqi).key].label}
                            </div>

                            {/* Kirleticiler */}
                            <div className="mb-3">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.pollutantBreakdown}</p>
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">PM2.5</p>
                                  <p className="text-xs font-black text-slate-700">{searchedStationData.iaqi.pm25?.v ?? '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">PM10</p>
                                  <p className="text-xs font-black text-slate-700">{searchedStationData.iaqi.pm10?.v ?? '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">O₃</p>
                                  <p className="text-xs font-black text-slate-700">{searchedStationData.iaqi.o3?.v ?? '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">NO₂</p>
                                  <p className="text-xs font-black text-slate-700">{searchedStationData.iaqi.no2?.v ?? '-'}</p>
                                </div>
                                {searchedStationData.iaqi.co?.v !== undefined && (
                                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] font-black text-slate-400 uppercase">CO</p>
                                    <p className="text-xs font-black text-slate-700">{searchedStationData.iaqi.co.v}</p>
                                  </div>
                                )}
                                {searchedStationData.iaqi.so2?.v !== undefined && (
                                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] font-black text-slate-400 uppercase">SO₂</p>
                                    <p className="text-xs font-black text-slate-700">{searchedStationData.iaqi.so2.v}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Hava Koşulları */}
                            <div className="mb-3">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.conditions}</p>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="bg-sky-50 p-2 rounded-xl border border-sky-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">{t.temp}</p>
                                  <p className="text-xs font-black text-sky-600">{searchedStationData.iaqi.t?.v ?? '-'}°C</p>
                                </div>
                                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">{t.hum}</p>
                                  <p className="text-xs font-black text-emerald-600">{searchedStationData.iaqi.h?.v ?? '-'}%</p>
                                </div>
                                <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">{t.press}</p>
                                  <p className="text-xs font-black text-indigo-600">{searchedStationData.iaqi.p?.v ?? '-'}</p>
                                </div>
                                <div className="bg-cyan-50 p-2 rounded-xl border border-cyan-100">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">{t.wind}</p>
                                  <p className="text-xs font-black text-cyan-600">{searchedStationData.iaqi.w?.v ?? '-'} m/s</p>
                                </div>
                              </div>
                            </div>

                            {/* UV Tahmini */}
                            {searchedStationData.forecast?.daily?.uvi && searchedStationData.forecast.daily.uvi.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{lang === 'tr' ? 'UV İndeksi' : 'UV Index'}</p>
                                <div className="flex gap-2 overflow-x-auto">
                                  {searchedStationData.forecast.daily.uvi.slice(0, 5).map((uv, i) => {
                                    const uvColor = uv.avg <= 2 ? 'bg-emerald-100 text-emerald-700' : uv.avg <= 5 ? 'bg-yellow-100 text-yellow-700' : uv.avg <= 7 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                                    return (
                                      <div key={i} className={`${uvColor} px-3 py-2 rounded-xl text-center min-w-[52px]`}>
                                        <p className="text-[7px] font-black uppercase">{new Date(uv.day).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' })}</p>
                                        <p className="text-sm font-black">{uv.avg}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Polen */}
                            {searchedPollenData && (
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{lang === 'tr' ? 'Polen' : 'Pollen'}</p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  {[
                                    { key: 'grass' as const, icon: '🌾', label: lang === 'tr' ? 'Çimen' : 'Grass' },
                                    { key: 'birch' as const, icon: '🌳', label: lang === 'tr' ? 'Huş' : 'Birch' },
                                    { key: 'alder' as const, icon: '🌿', label: lang === 'tr' ? 'Kızılağaç' : 'Alder' },
                                    { key: 'olive' as const, icon: '🫒', label: lang === 'tr' ? 'Zeytin' : 'Olive' },
                                    { key: 'mugwort' as const, icon: '🌱', label: lang === 'tr' ? 'Yavşan' : 'Mugwort' },
                                    { key: 'ragweed' as const, icon: '🌼', label: lang === 'tr' ? 'Kanarya' : 'Ragweed' },
                                  ].map(p => {
                                    const val = searchedPollenData[p.key];
                                    return (
                                      <div key={p.key} className="bg-amber-50 p-2 rounded-xl border border-amber-100">
                                        <p className="text-[7px] font-black text-slate-400 uppercase">{p.icon} {p.label}</p>
                                        <p className="text-xs font-black text-amber-700">{val !== null ? Math.round(val) : '-'}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Nearby Stations */}
              {nearbyStations.length > 0 && (
                <section id="section-nearby" className="bg-white rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-slate-100 scroll-mt-safe">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">
                      {lang === 'tr' ? 'Yakındaki İstasyonlar' : 'Nearby Stations'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {nearbyStations.map((station) => {
                      const meta = getAqiMetadata(station.aqi);
                      return (
                        <button
                          key={station.uid}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const data = await waqiService.fetchStationById(station.uid);
                              setStationData(data);
                            } catch (err) {
                              console.error('Station fetch error:', err);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-left active:scale-[0.98]"
                        >
                          <div className={`w-10 h-10 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
                            <span className="text-sm font-black">{station.aqi}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{station.name}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{station.distance.toFixed(1)} km</p>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section id="section-map" className="bg-white rounded-[2.5rem] p-3 sm:p-4 shadow-sm border border-slate-100 overflow-hidden scroll-mt-safe">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-3 py-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{t.heatmap}</h3>
                  </div>
                  <button
                    onClick={() => setShowHeatmapModal(true)}
                    className="w-full sm:w-auto px-4 py-2 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all shadow-sm bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    {lang === 'tr' ? 'TAM EKRAN' : 'FULL SCREEN'}
                  </button>
                </div>
                <div
                  onClick={() => setShowHeatmapModal(true)}
                  className="relative h-[320px] sm:h-[450px] w-full cursor-zoom-in"
                >
                  <AirMap mode={mapMode} geo={stationData.city.geo} aqi={stationData.aqi} label={stationData.city.name} translations={t} />
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 shadow">
                    {lang === 'tr' ? 'POPUP AC' : 'OPEN POPUP'}
                  </div>
                </div>
              </section>
            </div>
          </main>
        )}

        {/* Mini Games Section */}
        <div id="section-games" className="scroll-mt-safe">
          <AirQualityGames lang={lang} cityName={stationData?.city?.name} />
        </div>

        {/* Educational Section */}
        <section id="section-learn" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-10 scroll-mt-safe">
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

          {/* UV Index Section */}
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 mb-12">
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-3">
              <span className="bg-amber-100 p-2 rounded-xl text-amber-600">☀️</span>
              {t.uvTitle}
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">{t.uvInfo}</p>

            <h4 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest">{t.uvScaleTitle}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {[
                { label: t.uvLevels.low, color: 'bg-emerald-500' },
                { label: t.uvLevels.moderate, color: 'bg-yellow-500' },
                { label: t.uvLevels.high, color: 'bg-orange-500' },
                { label: t.uvLevels.veryHigh, color: 'bg-red-500' },
                { label: t.uvLevels.extreme, color: 'bg-purple-600' },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`${item.color} text-white py-3 px-2 rounded-2xl mb-2 shadow-lg`}>
                    <div className="text-sm font-black">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-[2rem] p-6 sm:p-8 text-white">
              <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-lg">🛡️</span>
                {t.uvProtectTitle}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[t.uvTip1, t.uvTip2, t.uvTip3, t.uvTip4].map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white/10 rounded-xl p-3 border border-white/20">
                    <div className="bg-white/20 rounded-full p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pollen Section */}
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 mb-12">
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-3">
              <span className="bg-green-100 p-2 rounded-xl text-green-600">🌿</span>
              {t.pollenTitle}
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">{t.pollenInfo}</p>

            <h4 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest">{t.pollenTypesTitle}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { title: lang === 'tr' ? 'Kızılağaç' : 'Alder', info: t.pollenAlderInfo, icon: '🌿', color: 'from-green-50 to-emerald-50', border: 'border-green-100' },
                { title: lang === 'tr' ? 'Huş Ağacı' : 'Birch', info: t.pollenBirchInfo, icon: '🌳', color: 'from-lime-50 to-green-50', border: 'border-lime-100' },
                { title: lang === 'tr' ? 'Çimen' : 'Grass', info: t.pollenGrassInfo, icon: '🌾', color: 'from-yellow-50 to-amber-50', border: 'border-yellow-100' },
                { title: lang === 'tr' ? 'Zeytin' : 'Olive', info: t.pollenOliveInfo, icon: '🫒', color: 'from-emerald-50 to-teal-50', border: 'border-emerald-100' },
                { title: lang === 'tr' ? 'Yavşan Otu' : 'Mugwort', info: t.pollenMugwortInfo, icon: '🌱', color: 'from-teal-50 to-cyan-50', border: 'border-teal-100' },
                { title: lang === 'tr' ? 'Kanarya Otu' : 'Ragweed', info: t.pollenRagweedInfo, icon: '🌼', color: 'from-orange-50 to-amber-50', border: 'border-orange-100' },
              ].map((item, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${item.color} rounded-[1.5rem] p-5 border ${item.border}`}>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h5 className="text-sm font-black text-slate-900 mb-2 tracking-tight">{item.title}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.info}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] p-6 sm:p-8 text-white">
              <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-lg">🤧</span>
                {t.pollenProtectTitle}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[t.pollenTip1, t.pollenTip2, t.pollenTip3, t.pollenTip4, t.pollenTip5].map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white/10 rounded-xl p-3 border border-white/20">
                    <div className="bg-white/20 rounded-full p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Source */}
          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 text-center">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t.dataSource}</h4>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto">{t.dataSourceDesc}</p>
          </div>
        </section>

        <footer className="mt-10 py-10 border-t border-slate-200/60 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-emerald-50/70 border border-emerald-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.25em]">
              {t.developedBy}
            </span>
            <a
              href="https://erdincyilmaz.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm sm:text-base font-black text-slate-900 hover:text-emerald-600 transition-colors duration-200"
            >
              Erdinç Yılmaz
            </a>
          </div>
        </footer>

        {
          showDownloadModal && (
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
          )
        }

        {
          showHeatmapModal && (
            <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-5xl shadow-2xl relative animate-in slide-in-from-bottom duration-300 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-[0.2em]">{t.heatmap}</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                    <button
                      onClick={() => setShowHeatmapModal(false)}
                      className="w-full sm:w-auto px-4 py-2 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all shadow-sm bg-slate-900 text-white hover:bg-black"
                    >
                      {lang === 'tr' ? 'KAPAT' : 'CLOSE'}
                    </button>
                  </div>
                </div>
                <div className="h-[60vh] sm:h-[70vh] w-full">
                  <AirMap mode={mapMode} geo={stationData?.city.geo} aqi={stationData?.aqi} label={stationData?.city.name} translations={t} />
                </div>
              </div>
            </div>
          )
        }


      </div >
    </div >
  );
};

export default App;
