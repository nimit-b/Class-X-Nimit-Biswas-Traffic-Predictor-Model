import React from 'react';
import { PredictionResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Info, AlertTriangle, Map, ShieldCheck, Zap, TrendingUp, Share2, Copy, CloudRain, Wind, Thermometer, Sun, Navigation, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResultsPanelProps {
  prediction: PredictionResult;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ prediction }) => {
  
  const getCongestionColor = (level: string) => {
    switch(level) {
      case 'Low': return 'text-emerald-400';
      case 'Moderate': return 'text-amber-400';
      case 'High': return 'text-orange-500';
      case 'Severe': return 'text-red-500';
      default: return 'text-indigo-400';
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`OmniFlow Traffic Report:\n${prediction.travelTimeEstimate} - ${prediction.congestionLevel} Traffic\n\n${prediction.summary.substring(0, 200)}...`);
    alert("Report copied to clipboard.");
  };

  return (
    <div className="mt-8 animate-fade-in space-y-6 pb-24 border-t border-slate-800/60 pt-6">
      
      {/* Action Bar */}
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-bold text-white">Analysis Results</h3>
         <div className="flex gap-2">
            <button onClick={handleCopy} className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                <Share2 className="w-3.5 h-3.5" /> Share
            </button>
         </div>
      </div>

      {/* Primary Status Card */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
              <Activity className="w-24 h-24 text-indigo-500" />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Congestion Level</span>
                    </div>
                    <div className={`text-3xl font-black tracking-tight ${getCongestionColor(prediction.congestionLevel)}`}>
                        {prediction.congestionLevel}
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="flex items-center justify-end gap-2 text-slate-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Est. Time</span>
                     </div>
                     <div className="text-2xl font-bold text-white">{prediction.travelTimeEstimate}</div>
                  </div>
              </div>
              
              {/* Traffic Bar Visual */}
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
                  {['Low', 'Moderate', 'High', 'Severe'].map((lvl, i) => {
                      const isActive = ['Low', 'Moderate', 'High', 'Severe'].indexOf(prediction.congestionLevel) >= i;
                      let bg = 'bg-transparent';
                      if (isActive) {
                          if (i === 0) bg = 'bg-emerald-500';
                          if (i === 1) bg = 'bg-amber-500';
                          if (i === 2) bg = 'bg-orange-500';
                          if (i === 3) bg = 'bg-red-500';
                      }
                      return <div key={lvl} className={`flex-1 transition-all duration-500 ${bg} ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
                  })}
              </div>
          </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Distance */}
        {prediction.routeStats && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Map className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Distance</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatDistance(prediction.routeStats.distanceMeters)}
            </div>
          </div>
        )}

        {/* Confidence */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-[10px] uppercase font-bold text-slate-400">AI Confidence</span>
            </div>
            <div className="text-xl font-bold text-white">{prediction.confidenceScore || 85}%</div>
        </div>
      </div>

      {/* Weather Card */}
      {prediction.detailedWeather && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-4 border-b border-slate-700/50 pb-2">
            <Sun className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Route Conditions</span>
            </div>
            <div className="grid grid-cols-3 gap-2 divide-x divide-slate-700/50 text-center">
                <div className="flex flex-col items-center">
                    <Thermometer className="w-5 h-5 text-orange-400 mb-1" />
                    <span className="text-lg font-bold text-white">{prediction.detailedWeather.temperature}°</span>
                    <span className="text-[10px] text-slate-500">Temp</span>
                </div>
                <div className="flex flex-col items-center">
                    <Wind className="w-5 h-5 text-cyan-400 mb-1" />
                    <span className="text-lg font-bold text-white">{prediction.detailedWeather.windSpeed}</span>
                    <span className="text-[10px] text-slate-500">km/h</span>
                </div>
                <div className="flex flex-col items-center">
                    <CloudRain className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-lg font-bold text-white">{prediction.detailedWeather.precipitationChance}%</span>
                    <span className="text-[10px] text-slate-500">Rain</span>
                </div>
            </div>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Traffic Trend (5 Hrs)
        </h3>
        <div className="h-40 w-full">
          {prediction.chartData && prediction.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={prediction.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="congestionLevel" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTraffic)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-600 text-xs italic">
              Chart data unavailable
            </div>
          )}
        </div>
      </div>

      {/* Alternatives List */}
      {prediction.alternatives && prediction.alternatives.length > 0 && (
         <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Routes</h3>
             {prediction.alternatives.map((alt, idx) => (
                 <div key={idx} className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex justify-between items-center hover:bg-slate-800/80 transition-all cursor-pointer group">
                     <div>
                         <div className="text-sm font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors flex items-center gap-2">
                            <Navigation className="w-3 h-3" />
                            {alt.name}
                         </div>
                         <div className="text-[10px] text-slate-500 mt-0.5">{alt.description}</div>
                     </div>
                     <div className="text-sm font-mono font-bold text-white bg-slate-900 px-2 py-1 rounded border border-slate-700">{alt.time}</div>
                 </div>
             ))}
         </div>
      )}

      {/* AI Analysis Text */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
          <Info className="w-3.5 h-3.5" />
          AI Engineering Report
        </h3>
        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
           <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-base font-bold text-white mt-4 mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xs font-bold text-indigo-400 mt-4 mb-1 uppercase tracking-wider" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400" {...props} />,
                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                p: ({node, ...props}) => <p className="mb-3 text-xs leading-relaxed text-slate-300" {...props} />,
                strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />
              }}
           >
             {prediction.summary}
           </ReactMarkdown>
        </div>
      </div>
      
    </div>
  );
};