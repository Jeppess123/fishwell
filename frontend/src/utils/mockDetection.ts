import { DetectionResult, FrameAnalysis, ProcessingStats } from '../types/detection';

// Mock fish detection function that simulates AI detection
export const mockFishDetection = (imageData?: string): DetectionResult[] => {
  const numFish = Math.floor(Math.random() * 5) + 1; // 1-5 fish
  const detections: DetectionResult[] = [];

  for (let i = 0; i < numFish; i++) {
    detections.push({
      id: `fish_${i}_${Date.now()}`,
      x: Math.random() * 600 + 50, // Random x position
      y: Math.random() * 400 + 50, // Random y position
      width: Math.random() * 100 + 50, // Random width
      height: Math.random() * 80 + 40, // Random height
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      class: 'fish'
    });
  }

  return detections;
};

// Process a single image file
export const processImage = async (file: File): Promise<FrameAnalysis> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      const detections = mockFishDetection(imageData);
      
      resolve({
        frameNumber: 0,
        fishCount: detections.length,
        detections,
        imageData
      });
    };
    reader.readAsDataURL(file);
  });
};

// Process a video file (simulated frame extraction)
export const processVideo = async (
  file: File,
  onProgress: (progress: number) => void,
  onFrameProcessed: (frame: FrameAnalysis) => void
): Promise<FrameAnalysis[]> => {
  return new Promise((resolve) => {
    const frames: FrameAnalysis[] = [];
    const totalFrames = Math.floor(Math.random() * 20) + 10; // 10-30 frames
    
    let processedFrames = 0;
    
    const processFrame = () => {
      if (processedFrames >= totalFrames) {
        resolve(frames);
        return;
      }
      
      const detections = mockFishDetection();
      const frame: FrameAnalysis = {
        frameNumber: processedFrames,
        timestamp: processedFrames * 0.5, // 0.5 seconds per frame
        fishCount: detections.length,
        detections
      };
      
      frames.push(frame);
      onFrameProcessed(frame);
      processedFrames++;
      
      const progress = (processedFrames / totalFrames) * 100;
      onProgress(progress);
      
      // Simulate processing delay
      setTimeout(processFrame, 200);
    };
    
    processFrame();
  });
};

// Calculate processing statistics
export const calculateStats = (frames: FrameAnalysis[], processingTime: number): ProcessingStats => {
  const totalFishDetected = frames.reduce((sum, frame) => sum + frame.fishCount, 0);
  const averageFishPerFrame = frames.length > 0 ? totalFishDetected / frames.length : 0;
  
  return {
    totalFrames: frames.length,
    processedFrames: frames.length,
    totalFishDetected,
    averageFishPerFrame,
    processingTime
  };
};

// Export results to CSV format
export const exportToCSV = (frames: FrameAnalysis[]): string => {
  const headers = ['Frame Number', 'Timestamp (s)', 'Fish Count', 'Average Confidence'];
  const rows = frames.map(frame => {
    const avgConfidence = frame.detections.length > 0
      ? frame.detections.reduce((sum, det) => sum + det.confidence, 0) / frame.detections.length
      : 0;
    
    return [
      frame.frameNumber,
      frame.timestamp?.toFixed(2) || 'N/A',
      frame.fishCount,
      (avgConfidence * 100).toFixed(1) + '%'
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  return csvContent;
};

// Download CSV file
export const downloadCSV = (csvContent: string, filename: string = 'fish_detection_results.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};