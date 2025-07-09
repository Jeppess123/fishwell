import { FrameAnalysis, ProcessingStats } from "../types/detection";

/**
 * Beregner statistikk for prosesserte frames
 */
export function calculateStats(frames: FrameAnalysis[], processingTime: number): ProcessingStats {
  const totalFish = frames.reduce((sum, f) => sum + f.fishCount, 0); // ✅ riktig felt
  const averageFishPerFrame = frames.length ? totalFish / frames.length : 0;

  return {
    totalFishDetected: totalFish,
    averageFishPerFrame,
    processedFrames: frames.length,
    totalFrames: frames.length,
    processingTime,
  };
}

/**
 * Gjør om frame-resultater til CSV
 */
export function exportToCSV(frames: FrameAnalysis[]): string {
  const header = "Frame,Timestamp,FishCount\n";
  const rows = frames
    .map((f) => `${f.frameNumber},${f.timestamp || ""},${f.fishCount}`) // ✅ bruker fishCount
    .join("\n");
  return header + rows;
}

/**
 * Starter nedlasting av CSV i nettleseren
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
