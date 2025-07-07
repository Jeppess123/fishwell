import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { FrameAnalysis } from '../types/detection';

interface ResultsViewerProps {
  results: FrameAnalysis[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({
  results,
  currentFrame,
  onFrameChange
}) => {
  const [zoom, setZoom] = useState(1);
  const [, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentResult = results[currentFrame];

  useEffect(() => {
    if (currentResult && canvasRef.current) {
      drawDetections();
    }
  }, [currentResult, zoom]);

  const drawDetections = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentResult) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentResult.imageData) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        drawBoundingBoxes(ctx);
      };
      img.src = currentResult.imageData.src;
    } else {
      canvas.width = 800;
      canvas.height = 600;
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e5e7eb';
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      drawBoundingBoxes(ctx);
    }
  };

  const drawBoundingBoxes = (ctx: CanvasRenderingContext2D) => {
    if (!currentResult) return;

    currentResult.detections.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      const confidence = detection.confidence;

      ctx.strokeStyle = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(x, y - 25, width, 25);
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText(
        `Fish ${index + 1} (${(confidence * 100).toFixed(1)}%)`,
        x + 5,
        y - 8
      );
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleResetZoom = () => setZoom(1);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!results.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center text-gray-500">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Maximize2 className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
        <p>Upload files and start processing to see detection results here.</p>
      </div>
    );
  }

  return (
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
      </div>

      <div className="relative bg-gray-100 overflow-auto" style={{ height: '500px' }}>
        <div className="flex items-center justify-center min-h-full p-4">
          <canvas ref={canvasRef} className="border border-gray-300 shadow-lg" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} />
        </div>
      </div>

      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => onFrameChange(Math.max(0, currentFrame - 1))} disabled={currentFrame === 0} className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 flex items-center space-x-2">
              <ChevronLeft className="w-4 h-4" /><span>Previous</span>
            </button>
            <span className="text-sm text-gray-600">Frame {currentFrame + 1} of {results.length}</span>
            <button onClick={() => onFrameChange(Math.min(results.length - 1, currentFrame + 1))} disabled={currentFrame === results.length - 1} className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 flex items-center space-x-2">
              <span>Next</span><ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {currentResult && (
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">{currentResult.fishCount} Fish Detected</p>
              {currentResult.timestamp && (
                <p className="text-sm text-gray-500">
                  Timestamp: {new Date(currentResult.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        <input
          type="range"
          min={0}
          max={results.length - 1}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
};

export default ResultsViewer;
