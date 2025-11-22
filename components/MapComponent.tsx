
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import { LocationData, PredictionResult } from '../types';
import L from 'leaflet';

interface MapComponentProps {
  origin: LocationData | null;
  destination: LocationData | null;
  prediction?: PredictionResult | null;
  routeCoordinates?: [number, number][];
}

// Custom DivIcons with better contrast for dark maps
const createCustomIcon = (color: string, label: string, glowColor: string) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="position: relative; width: 32px; height: 32px;">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 50%;
          border: 3px solid #1e293b;
          box-shadow: 0 0 15px ${glowColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 900;
          font-family: sans-serif;
          z-index: 20;
        ">
          ${label}
        </div>
        ${label === 'A' ? `<div style="
          position: absolute;
          top: -4px; left: -4px; right: -4px; bottom: -4px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.4;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          z-index: 10;
        "></div>` : ''}
      </div>
      <style>
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36]
  });
};

const iconOrigin = createCustomIcon('#10b981', 'A', 'rgba(16, 185, 129, 0.5)'); 
const iconDest = createCustomIcon('#ef4444', 'B', 'rgba(239, 68, 68, 0.5)');   

function MapUpdater({ origin, destination, prediction, routeCoordinates }: MapComponentProps) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);

    const coords = prediction?.routeCoordinates || routeCoordinates;

    if (coords && coords.length > 0) {
       const polylineBounds = L.latLngBounds(coords);
       map.fitBounds(polylineBounds, { padding: [50, 50], animate: true, duration: 1 });
    } else if (origin && destination) {
      const bounds = L.latLngBounds([origin.lat, origin.lon], [destination.lat, destination.lon]);
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    } else if (origin) {
      map.setView([origin.lat, origin.lon], 13, { animate: true }); 
    }

    return () => clearTimeout(timer);
  }, [origin, destination, prediction, routeCoordinates, map]);

  return null;
}

const getPathColor = (level?: string) => {
  switch(level) {
    case 'Low': return '#10b981';      // Green
    case 'Moderate': return '#f59e0b'; // Amber
    case 'High': return '#f97316';     // Orange
    case 'Severe': return '#ef4444';   // Red
    default: return '#6366f1';         // Indigo (Neutral)
  }
};

export const MapComponent: React.FC<MapComponentProps> = ({ origin, destination, prediction, routeCoordinates }) => {
  const defaultCenter: [number, number] = [39.8283, -98.5795]; 

  // Logic to split the main route coordinate array into colored segments
  const segments = useMemo(() => {
    const coords = prediction?.routeCoordinates || routeCoordinates;

    if (!coords || coords.length === 0) {
      return [];
    }

    if (!prediction?.routeSegments) {
      // If no segments, return one big segment
      return [{
        positions: coords,
        color: prediction ? getPathColor(prediction.congestionLevel) : '#6366f1',
        level: prediction?.congestionLevel || 'Unknown'
      }];
    }

    const totalPoints = coords.length;
    const result = [];

    for (const seg of prediction.routeSegments) {
      const startIndex = Math.floor((seg.startPercentage / 100) * totalPoints);
      const endIndex = Math.floor((seg.endPercentage / 100) * totalPoints);
      
      // Ensure valid slice indices
      const safeStart = Math.max(0, Math.min(startIndex, totalPoints - 1));
      const safeEnd = Math.max(0, Math.min(endIndex, totalPoints));
      
      // We need at least 2 points to draw a line
      if (safeEnd - safeStart > 0) {
        const segmentCoords = coords.slice(safeStart, safeEnd + 1); // +1 to overlap slightly for continuity
        if (segmentCoords.length > 1) {
          result.push({
            positions: segmentCoords,
            color: getPathColor(seg.congestionLevel),
            level: seg.congestionLevel
          });
        }
      }
    }
    return result;
  }, [prediction, routeCoordinates]);

  return (
    <div className="h-full w-full relative bg-slate-950">
        <MapContainer 
          center={defaultCenter} 
          zoom={4} 
          style={{ height: '100%', width: '100%', background: '#020617' }} 
          className="z-0"
        >
        {/* Carto Dark Matter for High Contrast */}
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater origin={origin} destination={destination} prediction={prediction} routeCoordinates={routeCoordinates} />

        {segments.map((seg, i) => (
           <React.Fragment key={i}>
             {/* Glow Effect (Wider, transparent line underneath) */}
             <Polyline 
               positions={seg.positions}
               pathOptions={{ 
                   color: seg.color, 
                   weight: 12, 
                   opacity: 0.2, 
                   lineCap: 'round',
                   lineJoin: 'round'
               }} 
             />
             {/* Main Route Line */}
             <Polyline 
               positions={seg.positions}
               pathOptions={{ 
                   color: seg.color, 
                   weight: 4, 
                   opacity: 1, 
                   lineCap: 'round',
                   lineJoin: 'round'
               }} 
             />
           </React.Fragment>
        ))}

        {/* Render Hotspots only on High/Severe segments */}
        {segments.filter(s => s.level === 'High' || s.level === 'Severe').map((seg, i) => {
             // Pick the middle point of the segment for a marker
             const midPoint = seg.positions[Math.floor(seg.positions.length / 2)];
             return (
               <CircleMarker 
                  key={`hotspot-${i}`}
                  center={midPoint} 
                  pathOptions={{ fillColor: seg.color, fillOpacity: 1, weight: 2, color: '#fff' }} 
                  radius={6}
              >
                  <Popup className="custom-popup">
                      <div className="text-slate-900 font-bold">Traffic Hotspot</div>
                      <div className="text-slate-700 text-xs">High congestion expected here.</div>
                  </Popup>
              </CircleMarker>
             )
        })}

        {origin && (
            <Marker position={[origin.lat, origin.lon]} icon={iconOrigin}>
            <Popup>
                <div className="font-bold text-slate-800">Start</div>
                <div className="text-slate-600 text-xs">{origin.name}</div>
            </Popup>
            </Marker>
        )}

        {destination && (
            <Marker position={[destination.lat, destination.lon]} icon={iconDest}>
            <Popup>
                <div className="font-bold text-slate-800">End</div>
                <div className="text-slate-600 text-xs">{destination.name}</div>
            </Popup>
            </Marker>
        )}
        </MapContainer>

        {/* Responsive Legend: Removed 'hidden xs:block' so it's always visible */}
        <div className="absolute bottom-6 right-6 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 md:p-4 rounded-xl shadow-2xl text-xs text-slate-200 block max-w-[150px] md:max-w-none">
            <h4 className="font-bold text-slate-400 mb-2 md:mb-3 uppercase tracking-wider text-[10px]">Traffic Heatmap</h4>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                    <span className="opacity-80 text-[10px] md:text-xs">Fast</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                    <span className="opacity-80 text-[10px] md:text-xs">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                    <span className="opacity-80 text-[10px] md:text-xs">Slow</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                    <span className="opacity-80 text-[10px] md:text-xs">Severe</span>
                </div>
            </div>
        </div>
    </div>
  );
};
