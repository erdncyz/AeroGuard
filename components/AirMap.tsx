
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { WAQI_TOKEN } from '../constants';

interface AirMapProps {
  geo?: [number, number];
  aqi?: number;
  label?: string;
  mode: 'station' | 'heatmap';
  translations: any;
}

const AirMap: React.FC<AirMapProps> = ({ geo, aqi, label, mode, translations }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const aqiLayerRef = useRef<L.TileLayer | null>(null);

  // Auto-resize map when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(geo || [39.0, 35.0], 6);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(mapRef.current);
      
      aqiLayerRef.current = L.tileLayer(`https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${WAQI_TOKEN}`, {
        attribution: 'Air Quality &copy; WAQI',
        opacity: 0.8
      }).addTo(mapRef.current);
      
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    if (selectedMarkerRef.current) {
      mapRef.current.removeLayer(selectedMarkerRef.current);
    }

    if (geo && aqi !== undefined) {
      const customIcon = L.divIcon({
        className: 'custom-selected-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 bg-white rounded-full opacity-30 animate-ping"></div>
            <div class="w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white font-black text-sm z-10 ${
              aqi <= 50 ? 'bg-emerald-500' : 
              aqi <= 100 ? 'bg-yellow-400 text-slate-800' : 
              aqi <= 150 ? 'bg-orange-500' : 
              aqi <= 200 ? 'bg-rose-500' : 
              aqi <= 300 ? 'bg-purple-600' : 'bg-red-950'
            }">
              ${aqi}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      selectedMarkerRef.current = L.marker(geo, { icon: customIcon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="p-1 font-sans">
            <div class="font-bold text-slate-800">${label || ''}</div>
            <div class="text-xs text-slate-500">AQI: <span class="font-bold">${aqi}</span></div>
          </div>
        `)
        .openPopup();
      
      if (mode === 'station') {
        mapRef.current.setView(geo, 12); // Slightly deeper zoom for stations
      }
    }

    // Refresh layout
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

  }, [geo, aqi, label, mode]);

  return (
    <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-inner border-2 border-slate-100">
      <div ref={containerRef} className="h-full w-full" />
      
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-1.5 pointer-events-none">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{translations.aqiScale}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-[9px] font-bold text-slate-600">{translations.mapLegend.good}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
          <span className="text-[9px] font-bold text-slate-600">{translations.mapLegend.moderate}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
          <span className="text-[9px] font-bold text-slate-600">{translations.mapLegend.bad}</span>
        </div>
      </div>
    </div>
  );
};

export default AirMap;
