import React, { useEffect, useMemo, useState } from 'react';
import { Language } from '../types';
import {
  getSwimmingAreaDetail,
  getSwimmingCities,
  getSwimmingTowns,
  searchSwimmingAreas,
  SwimArea,
  SwimAreaDetail,
  SwimCity,
  SwimTown,
} from '../services/swimmingService';

type Props = {
  lang: Language;
};

const qualityMeta: Record<string, { tr: string; en: string; badge: string }> = {
  MUKEMMEL: { tr: 'Mükemmel', en: 'Excellent', badge: 'bg-sky-100 text-sky-700' },
  IYI: { tr: 'İyi', en: 'Good', badge: 'bg-emerald-100 text-emerald-700' },
  YETERLI: { tr: 'Yeterli', en: 'Sufficient', badge: 'bg-amber-100 text-amber-700' },
  ZAYIF: { tr: 'Zayıf', en: 'Poor', badge: 'bg-rose-100 text-rose-700' },
};

const normalizeQuality = (value: string) =>
  (value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');

const getQualityView = (quality: string, lang: Language) => {
  const key = normalizeQuality(quality);
  const found = qualityMeta[key];

  if (found) {
    return {
      label: lang === 'tr' ? found.tr : found.en,
      badge: found.badge,
    };
  }

  return {
    label: quality || (lang === 'tr' ? 'Bilinmiyor' : 'Unknown'),
    badge: 'bg-slate-100 text-slate-600',
  };
};

const formatDate = (value: string | undefined, lang: Language): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');
};

const getSwimApiErrorMessage = (error: unknown, lang: Language): string => {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('500') && message.toLowerCase().includes('missing swimming_api_user')) {
    return lang === 'tr'
      ? 'Yüzme API proxy ayarlı değil. .env.local dosyasına SWIMMING_API_USER ve SWIMMING_API_PASSWORD ekleyin.'
      : 'Swimming API proxy is not configured. Add SWIMMING_API_USER and SWIMMING_API_PASSWORD to .env.local.';
  }

  if (message.includes('401') || message.includes('403')) {
    return lang === 'tr'
      ? 'Yüzme API kimlik doğrulaması başarısız. SWIMMING_API_USER/SWIMMING_API_PASSWORD değerlerini kontrol edin.'
      : 'Swimming API authentication failed. Check SWIMMING_API_USER/SWIMMING_API_PASSWORD values.';
  }

  return lang === 'tr' ? 'Yüzme API verisine ulaşılamadı.' : 'Could not reach swimming API data.';
};

const SwimmingQualityPanel: React.FC<Props> = ({ lang }) => {
  const [cities, setCities] = useState<SwimCity[]>([]);
  const [towns, setTowns] = useState<SwimTown[]>([]);
  const [areas, setAreas] = useState<SwimArea[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');
  const [selectedTownId, setSelectedTownId] = useState<number | ''>('');
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [detailById, setDetailById] = useState<Record<string, SwimAreaDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      setLoadingCities(true);
      setError('');
      try {
        const response = await getSwimmingCities();
        if (mounted) {
          setCities(response.sort((a, b) => a.name.localeCompare(b.name, 'tr')));
        }
      } catch (err) {
        if (mounted) {
          setError(getSwimApiErrorMessage(err, lang));
        }
      } finally {
        if (mounted) setLoadingCities(false);
      }
    };

    loadCities();
    return () => {
      mounted = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!selectedCityId) {
      setTowns([]);
      setSelectedTownId('');
      return;
    }

    let mounted = true;

    const loadTowns = async () => {
      try {
        const response = await getSwimmingTowns(selectedCityId);
        if (mounted) {
          setTowns(response.sort((a, b) => a.name.localeCompare(b.name, 'tr')));
        }
      } catch {
        if (mounted) {
          setTowns([]);
        }
      }
    };

    loadTowns();
    return () => {
      mounted = false;
    };
  }, [selectedCityId]);

  const loadAreas = async () => {
    setLoadingAreas(true);
    setError('');
    try {
      const result = await searchSwimmingAreas({
        cityId: selectedCityId || undefined,
        townId: selectedTownId || undefined,
      });
      setAreas(result.items || []);
      setTotalCount(result.totalCount || 0);
      setSelectedAreaId('');
      setDetailError('');
    } catch (err) {
      setError(getSwimApiErrorMessage(err, lang));
      setAreas([]);
      setTotalCount(0);
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleAreaClick = async (id: string) => {
    setSelectedAreaId(id);
    setDetailError('');

    if (detailById[id]) {
      return;
    }

    setLoadingDetail(true);
    try {
      const detail = await getSwimmingAreaDetail(id);
      setDetailById((prev) => ({ ...prev, [id]: detail }));
    } catch {
      setDetailError(lang === 'tr' ? 'Detay verisi alınamadı.' : 'Detail data could not be fetched.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectedAreaDetail = selectedAreaId ? detailById[selectedAreaId] : null;

  const qualityCounts = useMemo(() => {
    return areas.reduce(
      (acc, area) => {
        const key = normalizeQuality(area.qualityClass);
        if (key.startsWith('MUKEMMEL')) acc.excellent += 1;
        else if (key.startsWith('IYI')) acc.good += 1;
        else if (key.startsWith('YETERLI')) acc.sufficient += 1;
        else if (key.startsWith('ZAYIF')) acc.poor += 1;
        return acc;
      },
      { excellent: 0, good: 0, sufficient: 0, poor: 0 }
    );
  }, [areas]);

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-5">
        <div className="bg-cyan-100 p-2 rounded-xl text-cyan-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 008 0V9a4 4 0 118 0v6a4 4 0 01-8 0" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">
            {lang === 'tr' ? 'Yüzme Suyu Kalitesi' : 'Swimming Water Quality'}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {lang === 'tr'
              ? 'Veri kaynağı: T.C. Sağlık Bakanlığı Yüzme Suyu Takip Sistemi'
              : 'Source: Ministry of Health Swimming Water Tracking System'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="md:col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            {lang === 'tr' ? 'İl' : 'City'}
          </label>
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value ? Number(e.target.value) : '')}
            disabled={loadingCities}
            className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none"
          >
            <option value="">{lang === 'tr' ? 'İl seçin' : 'Select city'}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            {lang === 'tr' ? 'İlçe' : 'Town'}
          </label>
          <select
            value={selectedTownId}
            onChange={(e) => setSelectedTownId(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedCityId}
            className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none disabled:opacity-60"
          >
            <option value="">{lang === 'tr' ? 'Tümü' : 'All'}</option>
            {towns.map((town) => (
              <option key={town.id} value={town.id}>
                {town.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={loadAreas}
            disabled={loadingAreas || loadingCities}
            className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all"
          >
            {loadingAreas ? (lang === 'tr' ? 'YÜKLENİYOR...' : 'LOADING...') : (lang === 'tr' ? 'YÜZME ALANI GETİR' : 'GET AREAS')}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 font-bold mb-3">{error}</p>
      )}

      {areas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{lang === 'tr' ? 'Gösterilen' : 'Shown'}</p>
            <p className="text-lg font-black text-slate-800">{areas.length}</p>
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
            <p className="text-[8px] font-black text-sky-500 uppercase tracking-widest">{lang === 'tr' ? 'Mükemmel' : 'Excellent'}</p>
            <p className="text-lg font-black text-sky-700">{qualityCounts.excellent}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{lang === 'tr' ? 'İyi' : 'Good'}</p>
            <p className="text-lg font-black text-emerald-700">{qualityCounts.good}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{lang === 'tr' ? 'Yeterli' : 'Sufficient'}</p>
            <p className="text-lg font-black text-amber-700">{qualityCounts.sufficient}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">{lang === 'tr' ? 'Zayıf' : 'Poor'}</p>
            <p className="text-lg font-black text-rose-700">{qualityCounts.poor}</p>
          </div>
        </div>
      )}

      {areas.length > 0 && (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {areas.map((area) => {
            const quality = getQualityView(area.qualityClass, lang);
            const isSelected = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => handleAreaClick(area.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-cyan-300 bg-cyan-50/70 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{area.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{area.townName}, {area.cityName}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${quality.badge}`}>
                    {quality.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-600 font-bold">
                    {lang === 'tr' ? 'Son Sonuç:' : 'Last Result:'} {area.sampleResultExplanation || '-'}
                  </span>
                  {area.hasBlueFlag && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                      {lang === 'tr' ? 'Mavi Bayrak' : 'Blue Flag'}
                    </span>
                  )}
                  {area.isProhibited && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-700">
                      {lang === 'tr' ? 'Yasaklı' : 'Prohibited'}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-cyan-700">
                  {lang === 'tr' ? 'Detayları Aç' : 'Open Details'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {loadingDetail && (
        <div className="mt-4 p-4 rounded-2xl border border-slate-100 bg-slate-50">
          <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {detailError && (
        <p className="text-sm text-rose-600 font-bold mt-4">{detailError}</p>
      )}

      {selectedAreaDetail && !loadingDetail && (
        <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">{selectedAreaDetail.name}</h4>
              <p className="text-xs text-slate-600 font-semibold">
                {selectedAreaDetail.townName}, {selectedAreaDetail.cityName}
              </p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white border border-cyan-200 text-cyan-700 uppercase tracking-widest">
              {selectedAreaDetail.code || '-'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white rounded-xl p-2.5 border border-slate-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{lang === 'tr' ? 'Duş' : 'Shower'}</p>
              <p className="text-sm font-black text-slate-800">{selectedAreaDetail.numberOfShowers ?? '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{lang === 'tr' ? 'Kabin' : 'Cabin'}</p>
              <p className="text-sm font-black text-slate-800">{selectedAreaDetail.numberOfCabins ?? '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{lang === 'tr' ? 'Cankurtaran' : 'Lifeguard'}</p>
              <p className="text-sm font-black text-slate-800">{selectedAreaDetail.numberOfLifeguards ?? '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{lang === 'tr' ? 'Su Tipi' : 'Water Type'}</p>
              <p className="text-sm font-black text-slate-800 truncate">{selectedAreaDetail.waterTypeName || '-'}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700 font-medium">
            <p><span className="font-black text-slate-900">{lang === 'tr' ? 'Adres:' : 'Address:'}</span> {selectedAreaDetail.swimmingAreaAdress || '-'}</p>
            <p><span className="font-black text-slate-900">{lang === 'tr' ? 'İşletme:' : 'Operator:'}</span> {selectedAreaDetail.businessName || '-'}</p>
            <p><span className="font-black text-slate-900">{lang === 'tr' ? 'Telefon:' : 'Phone:'}</span> {selectedAreaDetail.businessPhone || '-'}</p>
            <p><span className="font-black text-slate-900">{lang === 'tr' ? 'En Yakın Sağlık Tesisi:' : 'Nearest Health Facility:'}</span> {selectedAreaDetail.nearestHealthFacility || '-'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            <p className="bg-white border border-slate-100 rounded-xl px-3 py-2">
              <span className="font-black text-slate-900">{lang === 'tr' ? 'Sezon Başlangıcı:' : 'Season Start:'}</span> {formatDate(selectedAreaDetail.swimmingSeasonStartDate, lang)}
            </p>
            <p className="bg-white border border-slate-100 rounded-xl px-3 py-2">
              <span className="font-black text-slate-900">{lang === 'tr' ? 'Sezon Bitişi:' : 'Season End:'}</span> {formatDate(selectedAreaDetail.swimmingSeasonEndDate, lang)}
            </p>
          </div>
        </div>
      )}

      {!loadingAreas && !error && areas.length === 0 && (
        <p className="text-sm text-slate-500 font-medium">
          {totalCount === 0
            ? (lang === 'tr' ? 'Filtre seçip yüzme alanlarını getir butonuna tıklayın.' : 'Select filters and click get areas.')
            : ''}
        </p>
      )}

      <div className="mt-4 text-right">
        <a
          href="https://yuzme.saglik.gov.tr/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-black uppercase tracking-widest text-cyan-700 hover:text-cyan-800"
        >
          {lang === 'tr' ? 'Resmi Sistemi Aç' : 'Open Official System'}
        </a>
      </div>
    </section>
  );
};

export default SwimmingQualityPanel;
