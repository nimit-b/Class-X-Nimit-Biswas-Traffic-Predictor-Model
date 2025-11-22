import React from 'react';
import { PredictionResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Clock, Info, AlertTriangle, BarChart3, Map } from 'lucide-react';
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

  return (
    <div className="mt-8 animate-fade-in space-y-6 pb-10">
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Travel Time */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Est. Time</span>
          </div>
          <div className="text-lg font-bold text-white leading-tight">{prediction.travelTimeEstimate}</div>
        </div>

        {/* Distance */}
        {prediction.routeStats && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Map className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Distance</span>
            </div>
            <div className="text-lg font-bold text-indigo-400 leading-tight">
              {formatDistance(prediction.routeStats.distanceMeters)}
            </div>
          </div>
        )}

        {/* Congestion Level */}
        <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4 relative overflow-hidden flex items-center justify-between hover:bg-slate-800/60 transition-colors">
          <div>
            <div className="flex items-center gap-2 text-slate-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Condition</span>
            </div>
            <div className={`text-xl font-bold ${getCongestionColor(prediction.congestionLevel)}`}>
                {prediction.congestionLevel} Traffic
            </div>
          </div>
          {/* Simple gauge visual */}
          <div className="flex gap-1.5">
             {['Low', 'Moderate', 'High', 'Severe'].map((l, i) => {
                 const levels = ['Low', 'Moderate', 'High', 'Severe'];
                 const currentIdx = levels.indexOf(prediction.congestionLevel);
                 const isActive = currentIdx >= i;
                 
                 let color = 'bg-slate-800 border border-slate-700';
                 if (isActive) {
                     if (i === 0) color = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] border-transparent';
                     if (i === 1) color = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)] border-transparent';
                     if (i === 2) color = 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)] border-transparent';
                     if (i === 3) color = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] border-transparent';
                 }
                 return <div key={l} className={`h-10 w-2.5 rounded-full ${color} transition-all duration-500`}></div>
             })}
          </div>
        </div>
      </div>

      {/* Main Chart: Timeline */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Forecast Trend (Next 5 Hrs)</h3>
        <div className="h-48 w-full">
          {prediction.chartData && prediction.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={prediction.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="congestionLevel" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTraffic)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-600 text-xs">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Traffic Impact Breakdown */}
      {prediction.trafficBreakdown && prediction.trafficBreakdown.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">
            <BarChart3 className="w-3 h-3" />
            Delay Contributors
          </h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prediction.trafficBreakdown} layout="vertical" margin={{ left: 0, right: 10, bottom: 0, top: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={70} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{fill: '#1e293b'}}
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                  {prediction.trafficBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Text Analysis */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
          <Info className="w-3 h-3" />
          Detailed Analysis
        </h3>
        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
           <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-700" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-sm font-bold text-indigo-300 mt-4 mb-2 uppercase tracking-wide" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xs font-bold text-slate-200 mt-3 mb-1" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400" {...props} />,
                li: ({node, ...props}) => <li className="marker:text-indigo-500" {...props} />,
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