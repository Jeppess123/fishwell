export interface DetectionResult {
  id: string;
  x: number;        // normalized coordinates (0-1)
  y: number;        // normalized coordinates (0-1)
  width: number;    // normalized coordinates (0-1)
  height: number;   // normalized coordinates (0-1)
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
