import React, { useEffect, useRef } from 'react';
import { FrameAnalysis, DetectionResult } from '../types/detection';

interface ResultsViewerProps {
  results: FrameAnalysis[];
  currentFrame: number;
  onFrameChange: (index: number) => void;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({
  results,
  currentFrame,
  onFrameChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const frame = results[currentFrame];
    if (!frame || !frame.imageData) return;

    const image = new Image();
    image.src = frame.imageData;

    image.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      console.log("Rendering detections:", frame.detections); // Debug

      frame.detections.forEach((det: DetectionResult) => {
        const { x, y, width, height, confidence, class: label } = det;

        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#00BFFF';
        const text = `${label ?? 'Fish'} (${Math.round(confidence * 100)}%)`;
        ctx.fillText(text, x + 4, y + 16);
      });
    };
  }, [results, currentFrame]);

  if (!results.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center text-gray-500">
        <p>No results to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Detection Result</h2>

      <div className="relative w-full max-w-full overflow-x-auto">
        <canvas ref={canvasRef} className="rounded-lg border border-gray-300" />
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => onFrameChange(Math.max(currentFrame - 1, 0))}
          disabled={currentFrame === 0}
          className="px-4 py-2 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 disabled:opacity-50"
        >
          ← Prev
        </button>

        <span className="text-sm text-gray-600">
          Frame {currentFrame + 1} of {results.length}
        </span>

        <button
          onClick={() => onFrameChange(Math.min(currentFrame + 1, results.length - 1))}
          disabled={currentFrame === results.length - 1}
          className="px-4 py-2 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ResultsViewer;
