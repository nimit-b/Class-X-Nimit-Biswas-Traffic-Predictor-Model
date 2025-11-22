import React, { useState, useEffect } from 'react';
import { Calendar, Navigation, MapPin, Search, Crosshair, Server, ChevronDown, Key, Save, Trash2, CheckCircle2, AlertCircle, RotateCcw, Settings2 } from 'lucide-react';

interface SidebarProps {
  onPredict: (origin: string, dest: string, date: string, apiKey?: string, provider?: string) => void;
  isLoading: boolean;
  defaultOrigin?: string;
  onLocateMe?: () => void;
}

type ApiProvider = 'openrouter' | 'openai' | 'gemini';

export const Sidebar: React.FC<SidebarProps> = ({ onPredict, isLoading, defaultOrigin, onLocateMe }) => {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  
  // Initialize date with current local time in format YYYY-MM-DDTHH:mm
  const [date, setDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  
  // API Configuration State
  const [provider, setProvider] = useState<ApiProvider>('openrouter');
  const [tempKey, setTempKey] = useState('');
  const [appliedKey, setAppliedKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load saved configuration on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('omniflow_api_key');
    const savedProvider = localStorage.getItem('omniflow_provider') as ApiProvider;
    
    if (savedProvider) setProvider(savedProvider);
    if (savedKey) {
      setTempKey(savedKey);
      setAppliedKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (defaultOrigin) {
      setOrigin(defaultOrigin);
    }
  }, [defaultOrigin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && dest && date) {
      onPredict(origin, dest, date, appliedKey || undefined, provider);
    }
  };

  const handleSaveKey = () => {
    if (tempKey.trim()) {
        setAppliedKey(tempKey);
        localStorage.setItem('omniflow_api_key', tempKey);
        localStorage.setItem('omniflow_provider', provider);
    }
  };

  const handleResetDefault = () => {
    setProvider('openrouter');
    setTempKey('');
    setAppliedKey('');
    localStorage.removeItem('omniflow_api_key');
    localStorage.setItem('omniflow_provider', 'openrouter');
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ApiProvider;
    setProvider(newProvider);
    localStorage.setItem('omniflow_provider', newProvider);
  };

  const isUsingCustomKey = appliedKey.length > 0;

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">Trip Details</h2>
        <p className="text-sm text-slate-400">Plan your journey with AI precision.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Origin Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Starting Point</label>
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
               <MapPin className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Central Park, NY"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              required
            />
            <button
              type="button"
              onClick={onLocateMe}
              className="absolute right-2 top-2 p-1.5 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
              title="Use Current Location"
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Destination Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Destination</label>
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-red-400 transition-colors">
               <Navigation className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="e.g. JFK Airport"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all shadow-sm"
              required
            />
          </div>
        </div>

        {/* Date Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Departure Time</label>
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
               <Calendar className="h-5 w-5" />
            </div>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
              required
            />
          </div>
        </div>

        {/* AI Configuration Toggle */}
        <div className="pt-4 border-t border-slate-800/60 mt-2">
           <button 
             type="button"
             onClick={() => setShowKeyInput(!showKeyInput)}
             className="w-full flex items-center justify-between group p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
           >
             <div className="flex items-center gap-2 text-indigo-400 group-hover:text-indigo-300 transition-colors">
               <Settings2 className="w-4 h-4" />
               <span className="text-xs font-medium">AI Model Settings</span>
             </div>
             <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${isUsingCustomKey ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {isUsingCustomKey ? 'Custom Key' : 'Default Key'}
             </span>
           </button>
           
           {showKeyInput && (
             <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2 bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-inner">
                {/* Provider Select */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Provider</label>
                    <div className="relative">
                        <select 
                            value={provider} 
                            onChange={handleProviderChange}
                            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        >
                            <option value="openrouter">OpenRouter (Recommended)</option>
                            <option value="openai">OpenAI (ChatGPT)</option>
                            <option value="gemini">Google Gemini</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>

                {/* Key Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">API Key</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
                            <input
                                type="password"
                                value={tempKey}
                                onChange={(e) => setTempKey(e.target.value)}
                                placeholder={provider === 'openai' ? 'sk-...' : provider === 'gemini' ? 'AIza...' : 'sk-or-...'}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveKey}
                            disabled={!tempKey}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-3 rounded-lg text-xs font-medium transition-all shadow-md active:scale-95 flex items-center justify-center"
                            title="Save Key"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Status & Reset */}
                <div className="flex items-center justify-between pt-1">
                     <div className="flex items-center gap-1.5">
                        {isUsingCustomKey ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                            <Server className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                            {isUsingCustomKey ? 'Custom API Active' : 'Using Shared API'}
                        </span>
                     </div>

                     {(isUsingCustomKey || provider !== 'openrouter') && (
                        <button
                            type="button"
                            onClick={handleResetDefault}
                            className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors border border-slate-700"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset to Default
                        </button>
                     )}
                </div>
             </div>
           )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`
            w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-xl shadow-indigo-900/20 transition-all 
            ${isLoading 
                ? 'bg-slate-700 cursor-wait' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/25 active:scale-[0.98]'
            }
          `}
        >
          {isLoading ? (
            <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                <span>Analyzing Route...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Predict Traffic</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};