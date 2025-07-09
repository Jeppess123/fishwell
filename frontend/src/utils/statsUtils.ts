import { FrameAnalysis, ProcessingStats } from '../types/detection';

export function calculateStats(frames: FrameAnalysis[], processingTime: number): ProcessingStats {
  const totalFrames = frames.length;
  const totalFish = frames.reduce((sum, frame) => sum + frame.fishCount, 0);

  return {
    totalFishDetected: totalFish,
    processedFrames: totalFrames,
    averageFishPerFrame: totalFrames > 0 ? totalFish / totalFrames : 0,
    processingTime,
  };
}

export function exportToCSV(frames: FrameAnalysis[]): string {
  const header = ['Frame Number', 'Fish Count', 'Timestamp'];
  const rows = frames.map(frame =>
    [frame.frameNumber, frame.fishCount, frame.timestamp].join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
