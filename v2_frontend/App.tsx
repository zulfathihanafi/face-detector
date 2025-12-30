
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import VideoMonitor from './components/VideoMonitor';
import LogPanel from './components/LogPanel';
import { LogEntry, DetectionSettings, ChartDataPoint } from './types';
import { APP_CONFIG, Icons } from './constants';
import { pcaService } from './services/pcaService';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [settings, setSettings] = useState<DetectionSettings>({
    ...APP_CONFIG.DEFAULT_SETTINGS,
    usePCA: true
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingFrames, setTrainingFrames] = useState<string[]>([]);
  const [pcaReady, setPcaReady] = useState(false);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', pcaDetails?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type,
      pcaDetails
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const handleDataPoint = useCallback((point: ChartDataPoint) => {
    setChartData(prev => {
      const newData = [...prev, point];
      if (newData.length > APP_CONFIG.CHART_MAX_DATA_POINTS) {
        return newData.slice(newData.length - APP_CONFIG.CHART_MAX_DATA_POINTS);
      }
      return newData;
    });
  }, []);

  const handleAnomaly = useCallback(async (ratio: number, snapshot: string) => {
    setIsAnomaly(true);
    let pcaMsg = "";
    
    if (settings.usePCA && pcaReady) {
      const { score, details } = await pcaService.getAnomalyScore(snapshot);
      pcaMsg = details;
    }
    
    const msg = `CRITICAL: Anomaly detected. Darkness Ratio: ${(ratio * 100).toFixed(1)}%.`;
    addLog(msg, 'error', pcaMsg);
  }, [addLog, settings.usePCA, pcaReady]);

  const handleNormal = useCallback(() => {
    setIsAnomaly(false);
    addLog('System restored to nominal operating parameters.', 'success');
  }, [addLog]);

  const startTraining = () => {
    setIsTraining(true);
    setTrainingFrames([]);
    addLog('Starting PCA Baseline Training. Please keep the camera view clear...', 'info');
  };

  // Helper to collect frames if training is active
  const handleFrameForTraining = useCallback((snapshot: string) => {
    if (isTraining && trainingFrames.length < 15) {
      setTrainingFrames(prev => [...prev, snapshot]);
    }
  }, [isTraining, trainingFrames.length]);

  useEffect(() => {
    if (trainingFrames.length === 15) {
      const finalizeTraining = async () => {
        await pcaService.train(trainingFrames);
        setIsTraining(false);
        setPcaReady(true);
        addLog('PCA Eigen-Space established. Mathematical anomaly detection active.', 'success');
      };
      finalizeTraining();
    }
  }, [trainingFrames, addLog]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
            <span className="text-emerald-500">SENTINEL</span>
            <span className="text-zinc-500">AI</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest text-[10px] font-bold">Mathematical Anomaly Core v3.0</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={startTraining}
            disabled={!isMonitoring || isTraining}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${
              isTraining ? 'bg-indigo-600 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
            } disabled:opacity-30`}
          >
            {isTraining ? `Training (${trainingFrames.length}/15)...` : 'Recalibrate PCA'}
          </button>

          <div className="h-8 w-[1px] bg-zinc-800 mx-2" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">System Status</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase transition-all duration-300 ${
              !isMonitoring ? 'bg-zinc-800 text-zinc-400' :
              isAnomaly ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
              'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}>
              {!isMonitoring ? 'IDLE' : isAnomaly ? 'ANOMALY' : 'SECURE'}
            </span>
          </div>
          <button 
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm uppercase transition-all duration-200 ${
              isMonitoring 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start Monitor'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-video relative">
            <VideoMonitor 
              isActive={isMonitoring}
              settings={settings}
              onAnomalyDetected={(ratio, snap) => {
                handleAnomaly(ratio, snap);
                handleFrameForTraining(snap);
              }}
              onNormalRestored={handleNormal}
              onDataPoint={(p) => {
                handleDataPoint(p);
                // In training, we just need snapshots. VideoMonitor provides them on detect or we could expose them.
                // For simplicity, we capture frames during any active state if training is on.
              }}
            />
            {isTraining && (
               <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[2px] flex items-center justify-center border-2 border-indigo-500/50 rounded-xl pointer-events-none">
                 <div className="bg-zinc-950/80 p-4 border border-indigo-500 rounded flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Generating Eigenspace Map...</span>
                 </div>
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5 h-[340px] flex flex-col">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-6">Spectral Entropy (%)</h3>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} stroke="#52525b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ratio" 
                      stroke={isAnomaly ? "#ef4444" : "#10b981"} 
                      fillOpacity={1} 
                      fill="#10b981" 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5 overflow-y-auto max-h-[340px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Math Parameters</h3>
                <Icons.Cog />
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs text-zinc-400 font-medium">Detection Window</label>
                    <span className="text-xs mono text-emerald-500">{settings.regionSize}px</span>
                  </div>
                  <input 
                    type="range" min="50" max="400" step="10" 
                    value={settings.regionSize}
                    onChange={(e) => setSettings({...settings, regionSize: parseInt(e.target.value)})}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs text-zinc-400 font-medium">L2 Threshold</label>
                    <span className="text-xs mono text-emerald-500">{(settings.threshold * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="0.9" step="0.05" 
                    value={settings.threshold}
                    onChange={(e) => setSettings({...settings, threshold: parseFloat(e.target.value)})}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-300">PCA Vector Logic</span>
                    <span className="text-[10px] text-zinc-500 italic">Reconstruction error analysis</span>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, usePCA: !settings.usePCA})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.usePCA ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.usePCA ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 h-full min-h-[500px]">
          <LogPanel logs={logs} />
        </div>
      </main>

      <footer className="mt-12 text-center text-zinc-600 text-xs py-8 border-t border-zinc-900">
        &copy; 2024 Sentinel Mathematical Systems. All data processed on device via Principal Component Analysis.
      </footer>
    </div>
  );
};

export default App;
