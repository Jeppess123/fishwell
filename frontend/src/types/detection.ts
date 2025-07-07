export interface DetectionResult {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface FrameAnalysis {
  frameNumber: number;
  fishCount: number;
  detections: Detection[];
  timestamp: string;
  imageData: {
    type: 'image' | 'video';
    src: string;
  };
}



export interface ProcessingStats {
  totalFishDetected: number;
  processedFrames: number;
  averageFishPerFrame: number;
  processingTime: number;
}


export interface ExportData {
  frameNumber: number;
  timestamp: string;
  fishCount: number;
  confidence: number;
}
