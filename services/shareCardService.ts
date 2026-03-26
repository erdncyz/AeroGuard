import { StationData } from '../types';

interface ShareCardOptions {
  stationData: StationData;
  levelLabel: string;
  lang: 'tr' | 'en';
}

const getAqiColor = (aqi: number): { bg: string; bgDark: string; text: string } => {
  if (aqi <= 50) return { bg: '#10b981', bgDark: '#059669', text: '#ffffff' };
  if (aqi <= 100) return { bg: '#facc15', bgDark: '#eab308', text: '#1e293b' };
  if (aqi <= 150) return { bg: '#f97316', bgDark: '#ea580c', text: '#ffffff' };
  if (aqi <= 200) return { bg: '#f43f5e', bgDark: '#e11d48', text: '#ffffff' };
  if (aqi <= 300) return { bg: '#9333ea', bgDark: '#7e22ce', text: '#ffffff' };
  return { bg: '#991b1b', bgDark: '#7f1d1d', text: '#ffffff' };
};

const getAqiEmoji = (aqi: number): string => {
  if (aqi <= 50) return '😊';
  if (aqi <= 100) return '🙂';
  if (aqi <= 150) return '😷';
  if (aqi <= 200) return '😨';
  if (aqi <= 300) return '🫁';
  return '☠️';
};

export const generateShareCard = async (options: ShareCardOptions): Promise<Blob> => {
  const { stationData, levelLabel, lang } = options;
  const { aqi, city, iaqi, dominentpol, time } = stationData;
  const colors = getAqiColor(aqi);
  const emoji = getAqiEmoji(aqi);

  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.arc(W - 100, 150, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(100, H - 100, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Top bar accent
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, colors.bg);
  topGrad.addColorStop(1, colors.bgDark);
  ctx.fillStyle = topGrad;
  roundRect(ctx, 0, 0, W, 8, 0);
  ctx.fill();

  // Brand header
  ctx.fillStyle = '#10b981';
  roundRect(ctx, 60, 50, 56, 56, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('☁', 72, 88);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('AeroGuard', 130, 78);
  ctx.fillStyle = '#10b981';
  ctx.fillText(' Pro', 130 + ctx.measureText('AeroGuard').width, 78);

  ctx.fillStyle = '#64748b';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText((lang === 'tr' ? 'HAVA KALİTESİ RAPORU' : 'AIR QUALITY REPORT').split('').join(' '), 132, 102);

  // Main AQI circle
  const cx = W / 2;
  const cy = 310;
  const r = 140;

  // Outer glow
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Circle ring
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
  ctx.fill();

  // Main circle
  const circGrad = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy, r);
  circGrad.addColorStop(0, colors.bg);
  circGrad.addColorStop(1, colors.bgDark);
  ctx.fillStyle = circGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // AQI number
  ctx.fillStyle = colors.text;
  ctx.font = '900 100px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(aqi), cx, cy + 30);

  // AQI label
  ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText('AQI INDEX', cx, cy + 58);
  ctx.globalAlpha = 1;

  // Level badge
  const badgeY = cy + r + 40;
  const badgeText = `${emoji}  ${levelLabel}`;
  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 60;
  ctx.fillStyle = colors.bg;
  roundRect(ctx, cx - badgeW / 2, badgeY, badgeW, 48, 24);
  ctx.fill();
  ctx.fillStyle = colors.text;
  ctx.fillText(badgeText, cx, badgeY + 33);

  // City name
  const cityY = badgeY + 80;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('📍 ' + (lang === 'tr' ? 'KONUM' : 'LOCATION'), cx, cityY);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  // Truncate long city names
  let cityName = city.name;
  while (ctx.measureText(cityName).width > W - 160 && cityName.length > 10) {
    cityName = cityName.slice(0, -4) + '...';
  }
  ctx.fillText(cityName, cx, cityY + 42);

  // Stats cards
  const statsY = cityY + 80;
  const cardW = 220;
  const cardH = 120;
  const cardGap = 24;
  const totalW = cardW * 4 + cardGap * 3;
  const startX = (W - totalW) / 2;

  const stats = [
    { label: 'PM2.5', value: iaqi.pm25?.v, unit: 'µg/m³' },
    { label: 'PM10', value: iaqi.pm10?.v, unit: 'µg/m³' },
    { label: 'O₃', value: iaqi.o3?.v, unit: 'ppb' },
    { label: 'NO₂', value: iaqi.no2?.v, unit: 'ppb' },
  ];

  stats.forEach((stat, i) => {
    const x = startX + i * (cardW + cardGap);
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, x, statsY, cardW, cardH, 20);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, statsY, cardW, cardH, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    const cardCx = x + cardW / 2;

    ctx.fillStyle = '#64748b';
    ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(stat.label, cardCx, statsY + 30);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(stat.value !== undefined ? String(stat.value) : '—', cardCx, statsY + 74);

    ctx.fillStyle = '#475569';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(stat.unit, cardCx, statsY + 100);
  });

  // Weather row
  const weatherY = statsY + cardH + 30;
  const weatherItems = [
    { label: lang === 'tr' ? 'Sıcaklık' : 'Temp', value: iaqi.t?.v !== undefined ? `${iaqi.t.v}°C` : '—', icon: '🌡' },
    { label: lang === 'tr' ? 'Nem' : 'Humidity', value: iaqi.h?.v !== undefined ? `${iaqi.h.v}%` : '—', icon: '💧' },
    { label: lang === 'tr' ? 'Basınç' : 'Pressure', value: iaqi.p?.v !== undefined ? `${iaqi.p.v} hPa` : '—', icon: '🔵' },
    { label: lang === 'tr' ? 'Ana Kirletici' : 'Dominant', value: dominentpol?.toUpperCase() || '—', icon: '⚠️' },
  ];

  const wCardW = 220;
  const wGap = 24;
  const wTotal = wCardW * 4 + wGap * 3;
  const wStartX = (W - wTotal) / 2;

  weatherItems.forEach((item, i) => {
    const x = wStartX + i * (wCardW + wGap);
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, x, weatherY, wCardW, 64, 16);
    ctx.fill();

    ctx.textAlign = 'center';
    const itemCx = x + wCardW / 2;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`${item.icon} ${item.label}`, itemCx, weatherY + 24);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(item.value, itemCx, weatherY + 50);
  });

  // Footer
  const footerY = H - 70;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.fillRect(60, footerY - 20, W - 120, 1);

  ctx.fillStyle = '#475569';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const updateTime = new Date(time.iso).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  ctx.fillText(updateTime + '  •  aeroguard.netlify.app', cx, footerY + 10);

  ctx.textAlign = 'left';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
};

export const shareWithImage = async (options: ShareCardOptions) => {
  const blob = await generateShareCard(options);
  const file = new File([blob], 'aeroguard-air-quality.png', { type: 'image/png' });
  const text = options.lang === 'tr'
    ? `${options.stationData.city.name} hava kalitesi: AQI ${options.stationData.aqi} (${options.levelLabel})`
    : `Air quality in ${options.stationData.city.name}: AQI ${options.stationData.aqi} (${options.levelLabel})`;

  // Try native share with image first
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        text: text + '\n\naeroguard.netlify.app',
        files: [file],
      });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  // Fallback: download image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aeroguard-air-quality.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
