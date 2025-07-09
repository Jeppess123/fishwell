<<<<<<< HEAD
<<<<<<< HEAD
import React, { useEffect, useRef } from 'react';
import { FrameAnalysis, DetectionResult } from '../types/detection';
=======
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { FrameAnalysis } from '../types/detection';
>>>>>>> 02b14d68 (kommitter prosjektet)
=======
import React, { useEffect, useRef } from 'react';
import { FrameAnalysis, DetectionResult } from '../types/detection';
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)

interface ResultsViewerProps {
  results: FrameAnalysis[];
  currentFrame: number;
<<<<<<< HEAD
<<<<<<< HEAD
  onFrameChange: (index: number) => void;
=======
  onFrameChange: (frame: number) => void;
>>>>>>> 02b14d68 (kommitter prosjektet)
=======
  onFrameChange: (index: number) => void;
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({
  results,
  currentFrame,
  onFrameChange
}) => {
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  const [zoom, setZoom] = useState(1);
  const [, setIsFullscreen] = useState(false);
=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
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
<<<<<<< HEAD
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center text-gray-500">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Maximize2 className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
        <p>Upload files and start processing to see detection results here.</p>
>>>>>>> 02b14d68 (kommitter prosjektet)
=======
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center text-gray-500">
        <p>No results to display</p>
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
      </div>
    );
  }

  return (
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Detection Result</h2>

      <div className="relative w-full max-w-full overflow-x-auto">
        <canvas ref={canvasRef} className="rounded-lg border border-gray-300" />
<<<<<<< HEAD
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
=======
    <div ref={containerRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Detection Results</h2>
        <div className="flex items-center space-x-2">
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-200 rounded-lg" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-200 rounded-lg" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={handleResetZoom} className="p-2 hover:bg-gray-200 rounded-lg" title="Reset Zoom"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-200 rounded-lg" title="Fullscreen"><Maximize2 className="w-4 h-4" /></button>
        </div>
=======
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
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

<<<<<<< HEAD
        <input
          type="range"
          min={0}
          max={results.length - 1}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
        />
>>>>>>> 02b14d68 (kommitter prosjektet)
=======
        <button
          onClick={() => onFrameChange(Math.min(currentFrame + 1, results.length - 1))}
          disabled={currentFrame === results.length - 1}
          className="px-4 py-2 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 disabled:opacity-50"
        >
          Next →
        </button>
>>>>>>> f142bbeb (Fix YOLOv8 dataset structure and frontend cleanup)
      </div>
    </div>
  );
};

export default ResultsViewer;
