import React from 'react';

interface AppDownloadPageProps {
  lang: 'tr' | 'en';
}

const AppDownloadPage: React.FC<AppDownloadPageProps> = ({ lang }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  // Auto-redirect if on mobile
  React.useEffect(() => {
    if (isIOS) {
      window.location.href = 'https://apps.apple.com/tr/app/aero-guard/id6757016984';
    } else if (isAndroid) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.aeroguardmobile';
    }
  }, [isIOS, isAndroid]);

  const handleIOSClick = () => {
    window.open('https://apps.apple.com/tr/app/aero-guard/id6757016984', '_blank');
  };

  const handleAndroidClick = () => {
    window.open('https://play.google.com/store/apps/details?id=com.aeroguardmobile', '_blank');
  };

  const content = {
    tr: {
      title: 'AeroGuard Mobil Uygulaması',
      subtitle: 'Her Yerde Hava Kalitesini Takip Et',
      description: 'iOS veya Android cihazınızda AeroGuard\'ı indirin ve gerçek zamanlı hava kalitesi verilerini her yerde erişin.',
      selectPlatform: 'Platform Seçin',
      ios: 'iOS İndir',
      android: 'Android İndir',
      features: 'Özellikler',
      feature1: 'Gerçek zamanlı AQI verisi',
      feature2: '7 gün hava kalitesi takvimi',
      feature3: 'UV İndeksi ve polen tahmini',
      feature4: 'Yapay zeka sağlık önerileri',
      feature5: 'Favori konumlar kaydet',
      autoRedirect: 'Cihazınız algılandı. Otomatik yönlendiriliyorsunuz...',
    },
    en: {
      title: 'AeroGuard Mobile App',
      subtitle: 'Track Air Quality Everywhere',
      description: 'Download AeroGuard on your iOS or Android device and access real-time air quality data anywhere.',
      selectPlatform: 'Select Your Platform',
      ios: 'Download for iOS',
      android: 'Download for Android',
      features: 'Features',
      feature1: 'Real-time AQI data',
      feature2: '7-day air quality calendar',
      feature3: 'UV Index and pollen forecast',
      feature4: 'AI-powered health advice',
      feature5: 'Save favorite locations',
      autoRedirect: 'Device detected. Redirecting...',
    },
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-slate-50">
      {/* Auto-redirect message */}
      {(isIOS || isAndroid) && (
        <div className="fixed top-0 left-0 right-0 bg-emerald-500 text-white py-3 text-center font-bold text-sm z-50">
          {t.autoRedirect}
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-3xl mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-4 tracking-tight">
            {t.title}
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 mb-4 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
          
          <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {t.description}
          </p>
        </div>

        {/* Platform Selection */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.selectPlatform}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* iOS Button */}
            <button
              onClick={handleIOSClick}
              className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-0.5 transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-900 rounded-[2.4rem] px-8 py-8 sm:py-10 text-center">
                <div className="mb-4 text-5xl">🍎</div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">{t.ios}</h3>
                <p className="text-sm text-slate-300">iPhone, iPad, Apple Watch</p>
                <div className="mt-4 inline-flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  App Store'da İndir
                </div>
              </div>
            </button>

            {/* Android Button */}
            <button
              onClick={handleAndroidClick}
              className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-emerald-600 p-0.5 transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2.4rem] px-8 py-8 sm:py-10 text-center">
                <div className="mb-4 text-5xl">🤖</div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">{t.android}</h3>
                <p className="text-sm text-emerald-100">Telefon, Tablet, Saat</p>
                <div className="mt-4 inline-flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Play Store'da İndir
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-8 sm:p-12 max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8 tracking-tight text-center">{t.features}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: '📊', text: t.feature1 },
              { icon: '📅', text: t.feature2 },
              { icon: '☀️', text: t.feature3 },
              { icon: '🤖', text: t.feature4 },
              { icon: '❤️', text: t.feature5 },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                <p className="text-slate-700 font-semibold">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* App Store Badges */}
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-6 font-medium">Uygulama mağazalarında indirilebilir</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="text-sm text-slate-500 bg-slate-100 rounded-lg px-4 py-2 font-mono">
              Version 2.1.0
            </div>
            <div className="text-sm text-slate-500 bg-slate-100 rounded-lg px-4 py-2 font-mono">
              ⭐ 4.8 Stars
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-slate-400 text-sm">
            © 2026 AeroGuard. {lang === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadPage;
