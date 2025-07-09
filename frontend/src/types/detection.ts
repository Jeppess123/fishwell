export interface DetectionResult {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface FrameAnalysis {
  frameNumber: number;
  timestamp?: number;
  fishCount: number;
  detections: DetectionResult[];
  imageData?: string;
}

export interface ProcessingStats {
  totalFrames: number;
  processedFrames: number;
  totalFishDetected: number;
  averageFishPerFrame: number;
  processingTime: number;
}

export interface ExportData {
  frameNumber: number;
  timestamp: string;
  fishCount: number;
  confidence: number;
}

export interface DetectionResponse {
  count: number;
  detections: DetectionResult[];
}
