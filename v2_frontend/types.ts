
export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  pcaDetails?: string;
}

export interface DetectionSettings {
  threshold: number;
  darkBrightness: number;
  regionSize: number;
  usePCA: boolean;
}

export interface ChartDataPoint {
  time: string;
  ratio: number;
  pcaError?: number;
}
