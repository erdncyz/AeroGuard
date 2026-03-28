import React, { useState, useEffect, useCallback } from 'react';
import * as waqiService from '../services/waqiService';
import { SearchResult } from '../types';

type Lang = 'tr' | 'en';
type GameTab = 'higherLower' | 'predict' | 'ranking';

interface CityAqi {
  name: string;
  aqi: number;
}

// Country-based city lists for location-aware games
const COUNTRY_CITIES: Record<string, string[]> = {
  Turkey: [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara',
    'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman',
    'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
    'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne',
    'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
    'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir',
    'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri',
    'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya',
    'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
    'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun',
    'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat',
    'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
  ],
  China: [
    'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Wuhan', 'Hangzhou',
    'Nanjing', 'Chongqing', 'Tianjin', 'Xian', 'Suzhou', 'Zhengzhou', 'Changsha',
    'Kunming', 'Dalian', 'Qingdao', 'Harbin', 'Fuzhou', 'Jinan'
  ],
  India: [
    'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune',
    'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Patna', 'Indore',
    'Bhopal', 'Chandigarh', 'Varanasi', 'Agra', 'Guwahati', 'Visakhapatnam'
  ],
  USA: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'San Francisco', 'Seattle', 'Denver', 'Washington', 'Nashville', 'Baltimore',
    'Las Vegas', 'Portland', 'Detroit', 'Memphis', 'Boston', 'Miami'
  ],
  Germany: [
    'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
    'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nuremberg'
  ],
  France: [
    'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
    'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Grenoble'
  ],
  UK: [
    'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield',
    'Edinburgh', 'Bristol', 'Cardiff', 'Belfast', 'Nottingham', 'Newcastle', 'Southampton'
  ],
  Japan: [
    'Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Kobe', 'Kyoto', 'Fukuoka',
    'Kawasaki', 'Sendai', 'Hiroshima', 'Kitakyushu', 'Chiba', 'Niigata'
  ],
  SouthKorea: [
    'Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan',
    'Suwon', 'Changwon', 'Seongnam', 'Goyang', 'Yongin', 'Cheongju', 'Jeonju'
  ],
  Italy: [
    'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence',
    'Catania', 'Bari', 'Venice', 'Verona', 'Padova', 'Brescia'
  ],
  Spain: [
    'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Murcia',
    'Palma', 'Bilbao', 'Alicante', 'Cordoba', 'Valladolid', 'Granada', 'Oviedo'
  ],
  Brazil: [
    'Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza', 'Belo Horizonte',
    'Manaus', 'Curitiba', 'Recife', 'Goiania', 'Belem', 'Porto Alegre'
  ],
};

// Detect country from station city name
const detectCountry = (cityName: string): string => {
  const lower = cityName.toLowerCase();
  // Turkish cities
  const turkishKeywords = ['turkey', 'türkiye', 'istanbul', 'ankara', 'izmir', 'antalya', 'bursa', 'adana', 'gaziantep', 'konya', 'mersin', 'kayseri', 'eskişehir', 'diyarbakır', 'samsun', 'trabzon'];
  if (turkishKeywords.some(k => lower.includes(k))) return 'Turkey';
  // China
  if (['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'wuhan'].some(k => lower.includes(k))) return 'China';
  // India
  if (['india', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad'].some(k => lower.includes(k))) return 'India';
  // USA
  if (['united states', 'usa', 'new york', 'los angeles', 'chicago', 'houston', 'phoenix'].some(k => lower.includes(k))) return 'USA';
  // Germany
  if (['germany', 'deutschland', 'berlin', 'hamburg', 'munich', 'münchen', 'cologne', 'köln', 'frankfurt'].some(k => lower.includes(k))) return 'Germany';
  // France
  if (['france', 'paris', 'marseille', 'lyon', 'toulouse'].some(k => lower.includes(k))) return 'France';
  // UK
  if (['united kingdom', 'england', 'london', 'birmingham', 'manchester', 'glasgow'].some(k => lower.includes(k))) return 'UK';
  // Japan
  if (['japan', 'tokyo', 'osaka', 'yokohama', 'nagoya', 'sapporo'].some(k => lower.includes(k))) return 'Japan';
  // South Korea
  if (['south korea', 'korea', 'seoul', 'busan', 'incheon'].some(k => lower.includes(k))) return 'SouthKorea';
  // Italy
  if (['italy', 'italia', 'rome', 'roma', 'milan', 'milano', 'naples', 'napoli'].some(k => lower.includes(k))) return 'Italy';
  // Spain
  if (['spain', 'españa', 'madrid', 'barcelona', 'valencia', 'seville'].some(k => lower.includes(k))) return 'Spain';
  // Brazil
  if (['brazil', 'brasil', 'sao paulo', 'rio de janeiro', 'brasilia'].some(k => lower.includes(k))) return 'Brazil';
  return 'global';
};

// Fallback global list
const GLOBAL_CITIES = [
  'Beijing', 'Delhi', 'London', 'Paris', 'Tokyo', 'Istanbul', 'New York',
  'Bangkok', 'Dubai', 'Seoul', 'Moscow', 'Cairo', 'Mumbai', 'Shanghai',
  'Los Angeles', 'Berlin', 'Rome', 'Madrid', 'Singapore', 'Sydney',
  'Ankara', 'Izmir', 'Jakarta', 'Mexico City', 'Sao Paulo', 'Lagos'
];

const T = {
  en: {
    sectionBadge: 'MINI GAMES',
    sectionTitle: 'Test Your Air Quality Knowledge',
    sectionDesc: 'Play fun games with real-time air quality data from around the world.',
    tabs: { higherLower: 'Higher or Lower', predict: 'Guess AQI', ranking: 'Rank Cities' },
    // Higher Lower
    hlTitle: 'Higher or Lower?',
    hlDesc: 'Is the AQI higher or lower than the first city?',
    hlHigher: 'HIGHER',
    hlLower: 'LOWER',
    hlCorrect: 'Correct!',
    hlWrong: 'Wrong!',
    hlScore: 'Score',
    hlBest: 'Best',
    hlNext: 'NEXT',
    hlPlayAgain: 'PLAY AGAIN',
    hlLoading: 'Loading cities...',
    hlVs: 'VS',
    // Predict
    prTitle: 'Guess the AQI',
    prDesc: 'How close can you guess this city\'s current AQI?',
    prYourGuess: 'Your guess',
    prSubmit: 'GUESS',
    prResult: 'Actual AQI',
    prDiff: 'Off by',
    prPerfect: 'Perfect!',
    prClose: 'Very close!',
    prGood: 'Good guess!',
    prFar: 'Not quite...',
    prNext: 'NEXT CITY',
    prScore: 'Total Score',
    prRound: 'Round',
    // Ranking
    rkTitle: 'Rank the Cities',
    rkDesc: 'Drag to rank cities from cleanest to most polluted.',
    rkCheck: 'CHECK ORDER',
    rkCorrect: 'correct',
    rkScore: 'Score',
    rkPlayAgain: 'NEW ROUND',
    rkCleanest: 'Cleanest',
    rkDirtiest: 'Most Polluted',
    rkResult: 'Actual AQI',
    rkUp: '↑',
    rkDown: '↓',
  },
  tr: {
    sectionBadge: 'MİNİ OYUNLAR',
    sectionTitle: 'Hava Kalitesi Bilgini Test Et',
    sectionDesc: 'Dünya genelindeki gerçek zamanlı hava kalitesi verileriyle eğlenceli oyunlar oyna.',
    tabs: { higherLower: 'Yüksek mi Düşük mü', predict: 'AQI Tahmin', ranking: 'Şehir Sırala' },
    // Higher Lower
    hlTitle: 'Yüksek mi Düşük mü?',
    hlDesc: 'İkinci şehrin AQI değeri birinciden yüksek mi düşük mü?',
    hlHigher: 'YÜKSEK',
    hlLower: 'DÜŞÜK',
    hlCorrect: 'Doğru!',
    hlWrong: 'Yanlış!',
    hlScore: 'Skor',
    hlBest: 'En İyi',
    hlNext: 'SONRAKİ',
    hlPlayAgain: 'TEKRAR OYNA',
    hlLoading: 'Şehirler yükleniyor...',
    hlVs: 'VS',
    // Predict
    prTitle: 'AQI\'yi Tahmin Et',
    prDesc: 'Bu şehrin anlık AQI değerini ne kadar yakın tahmin edebilirsin?',
    prYourGuess: 'Tahminin',
    prSubmit: 'TAHMİN ET',
    prResult: 'Gerçek AQI',
    prDiff: 'Fark',
    prPerfect: 'Mükemmel!',
    prClose: 'Çok yakın!',
    prGood: 'İyi tahmin!',
    prFar: 'Uzak kaldın...',
    prNext: 'SONRAKİ ŞEHİR',
    prScore: 'Toplam Skor',
    prRound: 'Tur',
    // Ranking
    rkTitle: 'Şehirleri Sırala',
    rkDesc: 'Şehirleri en temizden en kirliye doğru sırala.',
    rkCheck: 'SIRALAMAYI KONTROL ET',
    rkCorrect: 'doğru',
    rkScore: 'Skor',
    rkPlayAgain: 'YENİ TUR',
    rkCleanest: 'En Temiz',
    rkDirtiest: 'En Kirli',
    rkResult: 'Gerçek AQI',
    rkUp: '↑',
    rkDown: '↓',
  }
};

const getAqiBarColor = (aqi: number) => {
  if (aqi <= 50) return 'bg-emerald-500';
  if (aqi <= 100) return 'bg-yellow-400';
  if (aqi <= 150) return 'bg-orange-500';
  if (aqi <= 200) return 'bg-rose-500';
  if (aqi <= 300) return 'bg-purple-600';
  return 'bg-red-900';
};

// Shuffle helper
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Fetch random city AQI
const fetchRandomCities = async (count: number, cityList: string[]): Promise<CityAqi[]> => {
  const picked = shuffle(cityList).slice(0, count + 4); // extra buffer
  const results: CityAqi[] = [];

  for (const city of picked) {
    if (results.length >= count) break;
    try {
      const stations = await waqiService.searchStations(city);
      const valid = stations.find(s => s.aqi && s.aqi !== '-' && !isNaN(Number(s.aqi)));
      if (valid) {
        results.push({ name: city, aqi: Number(valid.aqi) });
      }
    } catch { /* skip */ }
  }

  return results;
};

// ==================== HIGHER OR LOWER ====================
const HigherLowerGame: React.FC<{ lang: Lang; cityList: string[] }> = ({ lang, cityList }) => {
  const t = T[lang];
  const [cities, setCities] = useState<CityAqi[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAqi, setShowAqi] = useState(false);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setScore(0);
    setCurrentIdx(0);
    setShowAqi(false);
    const data = await fetchRandomCities(10, cityList);
    setCities(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadCities(); }, [loadCities]);

  const cityA = cities[currentIdx];
  const cityB = cities[currentIdx + 1];

  const handleGuess = (guess: 'higher' | 'lower') => {
    if (!cityA || !cityB) return;
    const isHigher = cityB.aqi >= cityA.aqi;
    const correct = (guess === 'higher' && isHigher) || (guess === 'lower' && !isHigher);
    setShowAqi(true);
    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > best) setBest(newScore);
      setResult('correct');
    } else {
      setResult('wrong');
    }
  };

  const handleNext = () => {
    if (result === 'wrong' || currentIdx + 2 >= cities.length) {
      loadCities();
    } else {
      setCurrentIdx(i => i + 1);
      setResult(null);
      setShowAqi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-500 font-bold">{t.hlLoading}</span>
      </div>
    );
  }

  if (!cityA || !cityB) {
    return (
      <div className="text-center py-12">
        <button onClick={loadCities} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest">{t.hlPlayAgain}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase">{t.hlScore}: <span className="text-emerald-600 text-sm">{score}</span></span>
          <span className="text-[10px] font-black text-slate-400 uppercase">{t.hlBest}: <span className="text-indigo-600 text-sm">{best}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* City A - known */}
        <div className="bg-slate-900 rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">#{currentIdx + 1}</p>
          <h4 className="text-base sm:text-lg font-black text-white mb-3 truncate">{cityA.name}</h4>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getAqiBarColor(cityA.aqi)} text-white`}>
            <span className="text-2xl font-black">{cityA.aqi}</span>
          </div>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">AQI</p>
        </div>

        {/* City B - to guess */}
        <div className="bg-white rounded-2xl p-5 text-center relative overflow-hidden border-2 border-dashed border-slate-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">#{currentIdx + 2}</p>
          <h4 className="text-base sm:text-lg font-black text-slate-800 mb-3 truncate">{cityB.name}</h4>

          {showAqi ? (
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getAqiBarColor(cityB.aqi)} text-white transition-all`}>
              <span className="text-2xl font-black">{cityB.aqi}</span>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 text-slate-400">
              <span className="text-2xl font-black">?</span>
            </div>
          )}
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">AQI</p>
        </div>
      </div>

      {/* Result or Buttons */}
      {result ? (
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black ${result === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {result === 'correct' ? '✓ ' + t.hlCorrect : '✗ ' + t.hlWrong}
          </div>
          <div>
            <button onClick={handleNext} className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
              {result === 'wrong' || currentIdx + 2 >= cities.length ? t.hlPlayAgain : t.hlNext}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleGuess('higher')} className="py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
            {t.hlHigher}
          </button>
          <button onClick={() => handleGuess('lower')} className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            {t.hlLower}
          </button>
        </div>
      )}
    </div>
  );
};

// ==================== PREDICT AQI ====================
// Generate multiple choice options from the real AQI
const generateOptions = (realAqi: number): number[] => {
  const options = new Set<number>([realAqi]);
  while (options.size < 4) {
    // Generate plausible distractors: offset by 15-120 from the real value
    const offset = Math.floor(Math.random() * 106) + 15;
    const sign = Math.random() > 0.5 ? 1 : -1;
    let fake = realAqi + offset * sign;
    fake = Math.max(5, Math.min(500, fake));
    if (!options.has(fake)) options.add(fake);
  }
  // Shuffle
  const arr = Array.from(options);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const PredictGame: React.FC<{ lang: Lang; cityList: string[] }> = ({ lang, cityList }) => {
  const t = T[lang];
  const [city, setCity] = useState<CityAqi | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadCity = useCallback(async () => {
    setLoading(true);
    setSubmitted(false);
    setSelected(null);
    const cities = await fetchRandomCities(1, cityList);
    if (cities.length > 0) {
      setCity(cities[0]);
      setOptions(generateOptions(cities[0].aqi));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCity(); }, [loadCity]);

  const isCorrect = submitted && city && selected === city.aqi;

  const handleSelect = (val: number) => {
    if (submitted) return;
    setSelected(val);
  };

  const handleSubmit = () => {
    if (selected === null || !city) return;
    setSubmitted(true);
    if (selected === city.aqi) {
      setTotalScore(s => s + 100);
    }
  };

  const handleNext = () => {
    setRound(r => r + 1);
    loadCity();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!city) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase">{t.prRound}: <span className="text-indigo-600 text-sm">{round}</span></span>
        <span className="text-[10px] font-black text-slate-400 uppercase">{t.prScore}: <span className="text-emerald-600 text-sm">{totalScore}</span></span>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-center text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-2">{lang === 'tr' ? 'BU ŞEHRİN AQI DEĞERİ KAÇ?' : 'WHAT IS THIS CITY\'S AQI?'}</p>
        <h4 className="text-2xl sm:text-3xl font-black tracking-tight">{city.name}</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isThis = selected === opt;
          const isAnswer = city.aqi === opt;
          let cls = 'bg-white border-2 border-slate-200 hover:border-indigo-400 text-slate-800';
          if (submitted && isAnswer) {
            cls = 'bg-emerald-50 border-2 border-emerald-400 text-emerald-700 ring-2 ring-emerald-300';
          } else if (submitted && isThis && !isAnswer) {
            cls = 'bg-red-50 border-2 border-red-300 text-red-700';
          } else if (!submitted && isThis) {
            cls = 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700 ring-2 ring-indigo-300';
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={submitted}
              className={`p-4 rounded-xl font-black text-lg transition-all active:scale-95 ${cls} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`inline-block w-4 h-4 rounded-full mr-2 ${getAqiBarColor(opt)}`} style={{display: 'inline-block', verticalAlign: 'middle'}}></div>
              {opt}
              {submitted && isAnswer && <span className="ml-2">✓</span>}
              {submitted && isThis && !isAnswer && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>

      {submitted ? (
        <div className="space-y-3">
          <div className="text-center">
            <span className={`inline-block px-5 py-2.5 rounded-full text-sm font-black ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isCorrect ? (lang === 'tr' ? '✓ Doğru! +100 puan' : '✓ Correct! +100 pts') : (lang === 'tr' ? `✗ Yanlış! Doğru cevap: ${city.aqi}` : `✗ Wrong! Correct: ${city.aqi}`)}
            </span>
          </div>
          <button onClick={handleNext} className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
            {t.prNext}
          </button>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed"
        >
          {t.prSubmit}
        </button>
      )}
    </div>
  );
};

// ==================== RANKING GAME ====================
const RankingGame: React.FC<{ lang: Lang; cityList: string[] }> = ({ lang, cityList }) => {
  const t = T[lang];
  const [cities, setCities] = useState<CityAqi[]>([]);
  const [userOrder, setUserOrder] = useState<CityAqi[]>([]);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const touchStartY = React.useRef<number>(0);
  const touchCurrentIdx = React.useRef<number | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setChecked(false);
    setCorrectCount(0);
    setDragIdx(null);
    setOverIdx(null);
    const data = await fetchRandomCities(5, cityList);
    setCities(data.sort((a, b) => a.aqi - b.aqi)); // correctly sorted
    setUserOrder(shuffle(data)); // shuffled for user
    setLoading(false);
  }, []);

  useEffect(() => { loadCities(); }, [loadCities]);

  // Mouse drag handlers
  const handleDragStart = (idx: number) => {
    if (checked) return;
    setDragIdx(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const handleDragEnd = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const arr = [...userOrder];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(overIdx, 0, moved);
      setUserOrder(arr);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  // Touch drag handlers
  const getIdxFromY = (clientY: number): number | null => {
    if (!listRef.current) return null;
    const children = Array.from(listRef.current.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    return null;
  };

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    if (checked) return;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentIdx.current = idx;
    setDragIdx(idx);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    const idx = getIdxFromY(y);
    if (idx !== null) setOverIdx(idx);
  };
  const handleTouchEnd = () => {
    if (touchCurrentIdx.current !== null && overIdx !== null && touchCurrentIdx.current !== overIdx) {
      const arr = [...userOrder];
      const [moved] = arr.splice(touchCurrentIdx.current, 1);
      arr.splice(overIdx, 0, moved);
      setUserOrder(arr);
    }
    setDragIdx(null);
    setOverIdx(null);
    touchCurrentIdx.current = null;
  };

  const checkOrder = () => {
    let correct = 0;
    userOrder.forEach((c, i) => {
      if (c.name === cities[i].name) correct++;
    });
    setCorrectCount(correct);
    setChecked(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-red-50 rounded-xl p-3 border border-slate-100">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
          <span className="text-emerald-600 flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[8px]">1</span>
            {t.rkCleanest}
          </span>
          <div className="flex-1 mx-3 flex items-center justify-center gap-1 text-slate-300">
            <span>─</span><span>─</span><span>▸</span>
          </div>
          <span className="text-red-600 flex items-center gap-1">
            {t.rkDirtiest}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[8px]">{userOrder.length}</span>
          </span>
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-1 font-semibold">
          {lang === 'tr' ? '🡇 Yukarıdan aşağıya: en düşük AQI → en yüksek AQI' : '🡇 Top to bottom: lowest AQI → highest AQI'}
        </p>
      </div>

      <div className="space-y-2" ref={listRef}>
        {userOrder.map((city, idx) => {
          const isCorrect = checked && city.name === cities[idx].name;
          const isWrong = checked && city.name !== cities[idx].name;
          const isDragging = dragIdx === idx;
          const isOver = overIdx === idx && dragIdx !== idx;
          return (
            <div
              key={city.name}
              draggable={!checked}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(idx, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all select-none ${
                isCorrect ? 'bg-emerald-50 border-emerald-300' :
                isWrong ? 'bg-red-50 border-red-200' :
                isDragging ? 'bg-indigo-50 border-indigo-300 opacity-50 scale-95' :
                isOver ? 'bg-indigo-50 border-indigo-400 border-dashed' :
                'bg-white border-slate-100 hover:border-slate-200'
              } ${!checked ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <span className="text-[10px] font-black text-slate-300 w-5 text-center">{idx + 1}</span>

              {!checked && (
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              )}

              <span className="flex-1 text-sm font-black text-slate-800 truncate">{city.name}</span>

              {checked && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${getAqiBarColor(city.aqi)} text-white`}>
                  {city.aqi}
                </span>
              )}

              {isCorrect && <span className="text-emerald-500 text-sm">✓</span>}
              {isWrong && <span className="text-red-400 text-sm">✗</span>}
            </div>
          );
        })}
      </div>

      {checked ? (
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-black">
            {correctCount}/{cities.length} {t.rkCorrect}
          </div>
          <div>
            <button onClick={loadCities} className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
              {t.rkPlayAgain}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={checkOrder} className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
          {t.rkCheck}
        </button>
      )}
    </div>
  );
};

// ==================== MAIN GAMES SECTION ====================
const AirQualityGames: React.FC<{ lang: Lang; cityName?: string }> = ({ lang, cityName }) => {
  const t = T[lang];
  const [activeGame, setActiveGame] = useState<GameTab>('higherLower');

  const country = cityName ? detectCountry(cityName) : 'global';
  const cityList = COUNTRY_CITIES[country] || GLOBAL_CITIES;
  const countryLabel = country === 'global' ? (lang === 'tr' ? 'Dünya' : 'World') : country === 'Turkey' ? (lang === 'tr' ? 'Türkiye' : 'Turkey') : country === 'USA' ? 'USA' : country === 'UK' ? 'UK' : country === 'SouthKorea' ? (lang === 'tr' ? 'Güney Kore' : 'South Korea') : country;

  return (
    <section className="max-w-5xl mx-auto mt-10 mb-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t.sectionBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">{t.sectionTitle}</h2>
        <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto font-medium">{t.sectionDesc}</p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-slate-100 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{lang === 'tr' ? 'Bölge' : 'Region'}: {countryLabel}</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
          {(['higherLower', 'predict', 'ranking'] as GameTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveGame(tab)}
              className={`flex-1 min-w-0 py-4 px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeGame === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/30'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {/* Game Area */}
        <div className="p-5 sm:p-8">
          {activeGame === 'higherLower' && <HigherLowerGame lang={lang} cityList={cityList} />}
          {activeGame === 'predict' && <PredictGame lang={lang} cityList={cityList} />}
          {activeGame === 'ranking' && <RankingGame lang={lang} cityList={cityList} />}
        </div>
      </div>
    </section>
  );
};

export default AirQualityGames;
