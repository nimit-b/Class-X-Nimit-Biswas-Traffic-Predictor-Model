import React, { useState, useCallback, useEffect } from 'react';
import { MapComponent } from './components/MapComponent';
import { Sidebar } from './components/Sidebar';
import { ResultsPanel } from './components/ResultsPanel';
import { predictTraffic } from './services/geminiService';
import { getCoordinates, getAddressFromCoordinates } from './services/geoService';
import { getWeatherForecast } from './services/weatherService';
import { getRouteGeometry } from './services/routingService';
import { PredictionResult, LocationData, RouteComposition } from './types';
import { Car, Map as MapIcon, Activity, AlertCircle, Menu, X, ArrowRightLeft } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [origin, setOrigin] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocationName, setUserLocationName] = useState<string>('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // Automatically close sidebar on very small screens if needed, 
        // but typically we let user control it unless rotation happens
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const currentLocData: LocationData = {
        name: "Current Location",
        lat: latitude,
        lon: longitude
      };
      setOrigin(currentLocData);

      try {
        const address = await getAddressFromCoordinates(latitude, longitude);
        if (address) {
          setUserLocationName(address);
          setOrigin({ ...currentLocData, name: address });
        } else {
          setUserLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (e) {
        console.warn("Reverse geocoding failed", e);
        setUserLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    }, (err) => {
      console.error("Geolocation error:", err);
      let msg = "Unable to retrieve your location.";
      if (err.code === err.PERMISSION_DENIED) msg = "Location permission denied.";
      else if (err.code === err.TIMEOUT) msg = "Location request timed out.";
      else if (window.location.protocol === 'file:') msg = "Geolocation does not work on local files (file://).";
      setError(msg);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }, []);

  useEffect(() => {
    handleLocateMe();
  }, [handleLocateMe]);

  const handlePredictionRequest = useCallback(async (originName: string, destName: string, datetime: string, apiKey?: string, provider?: string) => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setRouteCoords(null);

    // On mobile, close sidebar immediately to show map loading state
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    try {
      // 1. Get Coordinates
      const [originData, destData] = await Promise.all([
        getCoordinates(originName),
        getCoordinates(destName)
      ]);

      if (!originData) throw new Error(`Could not locate origin: "${originName}".`);
      if (!destData) throw new Error(`Could not locate destination: "${destName}".`);

      setOrigin(originData);
      setDestination(destData);

      // 2. Fetch Route Geometry & Composition
      const routeResult = await getRouteGeometry(originData.lat, originData.lon, destData.lat, destData.lon);
      
      if (routeResult && routeResult.coordinates.length > 0) {
        setRouteCoords(routeResult.coordinates);
      }

      // 3. Fetch Detailed Hourly Weather
      const weather = await getWeatherForecast(destData.lat, destData.lon, datetime);

      // 4. AI Prediction with Enhanced Context
      const result = await predictTraffic(
        originName, 
        destName, 
        datetime, 
        weather, 
        routeResult?.stats,
        routeResult?.composition, 
        apiKey,
        provider
      );
      
      if (routeResult) {
        result.routeCoordinates = routeResult.coordinates;
      }

      setPrediction(result);
      
      // Re-open sidebar to show results
      setIsSidebarOpen(true);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setIsSidebarOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 md:px-6 backdrop-blur-md z-50">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white active:scale-95 transition-all"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                <Car className="h-5 w-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white leading-none">OmniFlow</h1>
                <p className="hidden xs:block text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">AI Traffic Intelligence</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2 hover:text-slate-300 transition-colors">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" /> 
                <span>OSRM Routing</span>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2 hover:text-slate-300 transition-colors">
                <Activity className="w-4 h-4 text-indigo-500" /> 
                <span>Gemini 2.0 / GPT-4</span>
            </div>
        </div>
      </header>

      <main className="relative flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <div 
          className={`
            absolute inset-y-0 left-0 z-40 w-full md:w-[400px] bg-slate-900/95 md:bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/60 
            transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none
          `}
        >
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
            <Sidebar 
              onPredict={handlePredictionRequest} 
              isLoading={loading} 
              defaultOrigin={userLocationName}
              onLocateMe={handleLocateMe}
            />
            
            {error && (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 flex items-start gap-3 animate-fade-in shadow-inner">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="text-sm font-bold text-red-100">System Notification</p>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {prediction && <ResultsPanel prediction={prediction} />}
          </div>
        </div>

        {/* Map Area */}
        <div className="absolute inset-0 md:relative md:flex-1 z-10 bg-slate-950">
           <MapComponent 
             origin={origin} 
             destination={destination} 
             prediction={prediction}
             routeCoordinates={routeCoords || undefined}
           />
           
           {/* Loading Overlay */}
           {loading && (
             <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm transition-all duration-300">
                <div className="flex flex-col items-center gap-5 bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative">
                      <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-slate-700 border-t-indigo-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                      </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="animate-pulse text-lg font-bold text-white tracking-wide">Synthesizing Data...</p>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Analysis in progress</p>
                  </div>
                </div>
             </div>
           )}

           {/* Mobile FAB to open Sidebar */}
           {!isSidebarOpen && !loading && (
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="absolute bottom-24 left-4 z-[400] md:hidden bg-indigo-600 text-white p-3.5 rounded-full shadow-lg shadow-indigo-900/50 active:scale-95 transition-all hover:bg-indigo-500"
               aria-label="Open controls"
             >
               <Menu className="w-6 h-6" />
             </button>
           )}
        </div>
      </main>
    </div>
  );
}