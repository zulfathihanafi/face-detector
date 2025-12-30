
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DetectionSettings, ChartDataPoint } from '../types';

interface VideoMonitorProps {
  settings: DetectionSettings;
  onAnomalyDetected: (ratio: number, snapshot: string) => void;
  onNormalRestored: () => void;
  onDataPoint: (point: ChartDataPoint) => void;
  isActive: boolean;
}

const VideoMonitor: React.FC<VideoMonitorProps> = ({ 
  settings, 
  onAnomalyDetected, 
  onNormalRestored, 
  onDataPoint,
  isActive 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const isAnomalyRef = useRef<boolean>(false);
  const lastProcessedRef = useRef<number>(0);

  useEffect(() => {
    async function setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera not supported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }

    if (isActive) {
      setupCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  const processFrame = useCallback(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Use a smaller processing scale for performance
    const displayWidth = video.videoWidth;
    const displayHeight = video.videoHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.drawImage(video, 0, 0);

    const now = Date.now();
    // Only process heavy logic every 200ms to save CPU
    if (now - lastProcessedRef.current > 150) {
      lastProcessedRef.current = now;

      const imageData = ctx.getImageData(0, 0, displayWidth, displayHeight);
      const data = imageData.data;

      let darkPixels = 0;
      let totalPixels = 0;
      
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const size = settings.regionSize;

      // Scanning region
      for (let y = Math.floor(centerY - size); y < Math.floor(centerY + size); y++) {
        for (let x = Math.floor(centerX - size); x < Math.floor(centerX + size); x++) {
          if (x >= 0 && x < displayWidth && y >= 0 && y < displayHeight) {
            const i = (y * displayWidth + x) * 4;
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            if (brightness < settings.darkBrightness) {
              darkPixels++;
            }
            totalPixels++;
          }
        }
      }

      const ratio = darkPixels / (totalPixels || 1);
      
      onDataPoint({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ratio: ratio * 100
      });

      if (ratio > settings.threshold) {
        if (!isAnomalyRef.current) {
          isAnomalyRef.current = true;
          const snapshot = canvas.toDataURL('image/jpeg', 0.8);
          onAnomalyDetected(ratio, snapshot);
        }
      } else {
        if (isAnomalyRef.current) {
          isAnomalyRef.current = false;
          onNormalRestored();
        }
      }
    }

    requestRef.current = requestAnimationFrame(processFrame);
  }, [isActive, settings, onAnomalyDetected, onNormalRestored, onDataPoint]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [processFrame]);

  return (
    <div className="relative w-full h-full bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover grayscale opacity-50"
      />
      
      {/* Visual Overlay of detection area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          style={{ width: settings.regionSize * 2, height: settings.regionSize * 2 }}
          className={`border-2 transition-colors duration-300 ${isAnomalyRef.current ? 'border-red-500 animate-pulse' : 'border-emerald-500/50'}`}
        >
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-inherit translate-x-[-2px] translate-y-[-2px]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-inherit translate-x-[2px] translate-y-[-2px]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-inherit translate-x-[-2px] translate-y-[2px]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-inherit translate-x-[2px] translate-y-[2px]" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] uppercase font-bold tracking-widest text-zinc-400 opacity-50 select-none">
            Detection Zone
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur border border-zinc-700 px-3 py-1 rounded text-[10px] mono text-zinc-300">
        LIVE FEED: 1080P/30FPS
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Recording</span>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoMonitor;
