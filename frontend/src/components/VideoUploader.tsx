import React, { useState, useRef } from 'react';
import { DetectionResult, FrameAnalysis } from '../types/detection';
import axios from 'axios';

interface VideoUploaderProps {
  onDetectionComplete: (results: FrameAnalysis[]) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onDetectionComplete }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [results, setResults] = useState<FrameAnalysis[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
      setResults([]);
      setProgress(0);
    }
  };

  const processVideo = async () => {
    if (!videoFile || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    setIsProcessing(true);

    await video.play();

    const fps = 2; // Analyser 2 frames per sekund
    const interval = 1 / fps;

    const processFrame = async () => {
      if (video.ended) {
        setIsProcessing(false);
        onDetectionComplete(results);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => blob && resolve(blob), 'image/jpeg')
      );

      if (imageBlob) {
        const formData = new FormData();
        formData.append('file', imageBlob, 'frame.jpg');

        try {
          const response = await axios.post('http://127.0.0.1:8000/detect/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const data = response.data as { detections: DetectionResult[] };
          
        
          const imageData = canvas.toDataURL('image/jpeg');
          const timestamp = video.currentTime;

          setResults((prev) => [
            ...prev,
            {
              detections: data.detections,
              imageData,
              timestamp,
              fishCount: data.detections.length,
              frameNumber: prev.length,
            },
          ]);

          setProgress(((results.length + 1) / (video.duration * fps)) * 100);
        } catch (error) {
          console.error('Detection error:', error);
        }
      }

      video.currentTime += interval;
    };

    video.onseeked = processFrame;
    video.currentTime = 0;
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Video Upload & Detection</h2>

      <input type="file" accept="video/*" onChange={handleFileChange} />

      {videoFile && (
        <button
          onClick={processVideo}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          {isProcessing ? 'Processing...' : 'Start Analysis'}
        </button>
      )}

      {isProcessing && (
        <div className="mt-2">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">{Math.round(progress)}% complete</p>
        </div>
      )}

      {/* Hidden video and canvas */}
      <video ref={videoRef} className="hidden" muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoUploader;
