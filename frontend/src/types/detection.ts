export interface DetectionResult {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

<<<<<<< HEAD
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
=======
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
>>>>>>> 02b14d68 (kommitter prosjektet)
  averageFishPerFrame: number;
  processingTime: number;
}

<<<<<<< HEAD
=======

>>>>>>> 02b14d68 (kommitter prosjektet)
export interface ExportData {
  frameNumber: number;
  timestamp: string;
  fishCount: number;
  confidence: number;
}
<<<<<<< HEAD

export interface DetectionResponse {
  count: number;
  detections: DetectionResult[];
}
=======
>>>>>>> 02b14d68 (kommitter prosjektet)
