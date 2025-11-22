import React, { useState, useCallback, useEffect } from 'react';
import { MapComponent } from './components/MapComponent';
import { Sidebar } from './components/Sidebar';
import { ResultsPanel } from './components/ResultsPanel';
import { predictTraffic } from './services/geminiService';
import { getCoordinates, getAddressFromCoordinates } from './services/geoService';
import { getWeatherForecast } from './services/weatherService';
import { getRouteGeometry } from './services/routingService';
import { PredictionResult, LocationData } from './types';
import { Car, Map as MapIcon, Activity, AlertCircle } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [origin, setOrigin] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocationName, setUserLocationName] = useState<string>('');

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

  const handlePredictionRequest = useCallback(async (originName: string, destName: string, datetime: string, apiKey?: string) => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // 1. Get Coordinates
      const [originData, destData] = await Promise.all([
        getCoordinates(originName),
        getCoordinates(destName)
      ]);

      if (!originData) throw new Error(`Could not locate origin: "${originName}". Try adding a city or zip code.`);
      if (!destData) throw new Error(`Could not locate destination: "${destName}". Try adding a city or zip code.`);

      setOrigin(originData);
      setDestination(destData);

      // 2. Fetch Weather
      const weather = await getWeatherForecast(destData.lat, destData.lon, datetime);
      const weatherSummary = weather 
        ? `${weather.description}, Temp: ${weather.temperature}°C`
        : null;

      // 3. Fetch Route & Stats (Real Distance/Duration)
      const routeResult = await getRouteGeometry(originData.lat, originData.lon, destData.lat, destData.lon);

      // 4. AI Prediction
      const result = await predictTraffic(
        originName, 
        destName, 
        datetime, 
        weatherSummary, 
        routeResult?.stats, 
        apiKey
      );
      
      // Merge route geometry
      if (routeResult) {
        result.routeCoordinates = routeResult.coordinates;
      }

      setPrediction(result);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-200">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">OmniFlow</h1>
            <p className="text-xs text-slate-400">AI-Powered Traffic Forecaster</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1"><MapIcon className="w-4 h-4" /> <span>Live OSRM Routing</span></div>
            <div className="flex items-center gap-1"><Activity className="w-4 h-4" /> <span>Open-Meteo & OpenRouter</span></div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <div className="w-full max-w-md shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/30 p-6 z-20 backdrop-blur-sm">
          <Sidebar 
            onPredict={handlePredictionRequest} 
            isLoading={loading} 
            defaultOrigin={userLocationName}
            onLocateMe={handleLocateMe}
          />
          
          {error && (
            <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-200 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">System Notification</p>
                <p className="text-xs opacity-80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {prediction && (
            <ResultsPanel prediction={prediction} />
          )}
        </div>

        <div className="relative flex-1 bg-slate-950 z-10 h-full">
           <MapComponent 
             origin={origin} 
             destination={destination} 
             prediction={prediction} 
           />
           
           {loading && (
             <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                  <div className="text-center">
                    <p className="animate-pulse text-lg font-medium text-white">Analyzing Route...</p>
                    <p className="text-sm text-slate-400">Consulting OSRM & Weather Data</p>
                  </div>
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}