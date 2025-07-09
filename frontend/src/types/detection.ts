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

=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
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
<<<<<<< HEAD
>>>>>>> 02b14d68 (kommitter prosjektet)
=======
  totalFishDetected: number;
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
  averageFishPerFrame: number;
  processingTime: number;
}

<<<<<<< HEAD
<<<<<<< HEAD
=======

>>>>>>> 02b14d68 (kommitter prosjektet)
=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
export interface ExportData {
  frameNumber: number;
  timestamp: string;
  fishCount: number;
  confidence: number;
}
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)

export interface DetectionResponse {
  count: number;
  detections: DetectionResult[];
}
<<<<<<< HEAD
=======
>>>>>>> 02b14d68 (kommitter prosjektet)
=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
