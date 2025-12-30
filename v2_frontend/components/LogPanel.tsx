
import React from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  return (
    <div className="flex flex-col h-full bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">System Logs</h3>
        <span className="text-[10px] mono text-zinc-500">{logs.length} EVENTS</span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">
            Monitoring logs clear.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`p-3 rounded-lg border flex flex-col gap-2 ${
              log.type === 'error' ? 'bg-red-500/10 border-red-500/20' : 
              log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 
              'bg-zinc-800/50 border-zinc-700'
            }`}>
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  log.type === 'error' ? 'bg-red-500 text-white' : 
                  log.type === 'success' ? 'bg-emerald-500 text-white' : 
                  'bg-zinc-700 text-zinc-300'
                }`}>
                  {log.type === 'error' ? 'ANOMALY' : log.type === 'success' ? 'STATUS' : 'INFO'}
                </span>
                <span className="text-[10px] mono text-zinc-500">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-tight">{log.message}</p>
              {log.pcaDetails && (
                <div className="mt-2 pt-2 border-t border-zinc-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">PCA Vector Analysis</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-hidden text-ellipsis">{log.pcaDetails}</p>
                </div>
              )}
            </div>
          )).reverse()
        )}
      </div>
    </div>
  );
};

export default LogPanel;
