
import React, { useState, useEffect } from 'react';
import { Calendar, Navigation, MapPin, Search, Crosshair, Key } from 'lucide-react';

interface SidebarProps {
  onPredict: (origin: string, dest: string, date: string, apiKey?: string) => void;
  isLoading: boolean;
  defaultOrigin?: string;
  onLocateMe?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onPredict, isLoading, defaultOrigin, onLocateMe }) => {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [date, setDate] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    if (defaultOrigin) {
      setOrigin(defaultOrigin);
    }
  }, [defaultOrigin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && dest && date) {
      onPredict(origin, dest, date, apiKey);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Trip Details</h2>
        <p className="text-sm text-slate-400">Enter your route to analyze potential delays.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Origin</label>
          <div className="relative group">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400" />
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Central Park, NY"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-10 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              required
            />
            <button
              type="button"
              onClick={onLocateMe}
              className="absolute right-2 top-2 p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              title="Use My Current Location"
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Destination</label>
          <div className="relative group">
            <Navigation className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400" />
            <input
              type="text"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="e.g. JFK Airport"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date & Time</label>
          <div className="relative group">
            <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400" />
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all [&::-webkit-calendar-picker-indicator]:invert"
              required
            />
          </div>
        </div>

        <div className="pt-2">
           <button 
             type="button"
             onClick={() => setShowKeyInput(!showKeyInput)}
             className="text-xs text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 mb-2"
           >
             <Key className="w-3 h-3" />
             {showKeyInput ? "Hide API Key Settings" : "Have your own OpenRouter Key?"}
           </button>
           
           {showKeyInput && (
             <div className="space-y-1 animate-fade-in">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 py-2 px-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500">Leave empty to use the shared default key.</p>
             </div>
           )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isLoading ? 'animate-pulse' : ''}`}
        >
          {isLoading ? (
            <>Calculating Route...</>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Predict Traffic
            </>
          )}
        </button>
      </form>
    </div>
  );
};
