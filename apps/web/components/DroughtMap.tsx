'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface CityData {
  name: string;
  lat: number;
  lon: number;
  facility: boolean;
  drought: { index: number; label: string; color: string };
  groundwaterStress: number;
  precipAnomaly: number;
  totalPrecip90: number;
  avgSoilMoisture: number;
}

interface Props {
  cities: CityData[];
  selected?: string;
  onSelect?: (name: string) => void;
  isDark?: boolean;
}

export default function DroughtMap({ cities, selected, onSelect, isDark = true }: Props) {
  useEffect(() => {
    // Fix Leaflet default icon path broken by webpack
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer
      center={[54.5, -3.5]}
      zoom={5}
      style={{ height: '100%', width: '100%', background: '#0f172a' }}
    >
      <TileLayer
        url={isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      {cities.map(city => {
        const isSelected = city.name === selected;
        const isFacility = city.facility;
        return (
          <CircleMarker
            key={city.name}
            center={[city.lat, city.lon]}
            radius={isFacility ? 14 : isSelected ? 12 : 9}
            pathOptions={{
              fillColor: city.drought.color,
              fillOpacity: isSelected || isFacility ? 1 : 0.75,
              color: isFacility ? '#fff' : isSelected ? '#fff' : city.drought.color,
              weight: isFacility ? 3 : isSelected ? 2.5 : 1,
            }}
            eventHandlers={{ click: () => onSelect?.(city.name) }}
          >
            <Tooltip
              permanent={isFacility}
              direction="top"
              offset={[0, -8]}
            >
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 160 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {city.name}{isFacility ? ' ⚙ Facility' : ''}
                </div>
                <div style={{ color: city.drought.color, fontWeight: 600 }}>
                  D{city.drought.index} — {city.drought.label}
                </div>
                <div>Groundwater stress: <b>{city.groundwaterStress}%</b></div>
                <div>90-day rain: <b>{city.totalPrecip90} mm</b></div>
                <div>Soil moisture: <b>{city.avgSoilMoisture}%</b></div>
                <div>Precip anomaly: <b>{city.precipAnomaly >= 0 ? '+' : ''}{city.precipAnomaly}%</b></div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
