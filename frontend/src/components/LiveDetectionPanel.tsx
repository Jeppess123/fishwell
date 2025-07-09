import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { motion } from 'framer-motion';

interface CameraCaptureProps {
  onFrameCapture: (imageDataUrl: string) => void;
  isProcessing: boolean;
  videoRefCallback?: (ref: HTMLVideoElement | null) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onFrameCapture,
  isProcessing,
  videoRefCallback
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((mediaDevices) => {
        setDevices(mediaDevices.filter(device => device.kind === 'videoinput'));
      })
      .catch(() => setError('Could not access camera devices.'));
  }, []);

  // Start camera logic
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        if (videoRefCallback) videoRefCallback(videoRef.current);
      }
    } catch {
      setError('Could not start camera.');
    }
  };

  // Capture frame and send to parent
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    onFrameCapture(imageDataUrl);
  };

  // Example: capture a frame every 1s if processing
  useEffect(() => {
    if (isProcessing && isCameraActive) {
      const interval = setInterval(captureFrame, 1000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, isCameraActive]);

  return (
    <div className="space-y-4">
      {/* Camera Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!isCameraActive && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startCamera}
            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg"
          >
            <Camera className="w-5 h-5" />
            <span>Start Camera</span>
          </motion.button>
        )}
      </div>

      {/* Camera Device Selection */}
      {devices.length > 1 && (
        <div className="flex items-center space-x-3">
          {/* ...device selector... */}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {/* Camera Feed with overlays */}
      <div className="relative w-full max-w-xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
        <video
          ref={el => {
            videoRef.current = el;
            if (videoRefCallback) videoRefCallback(el);
          }}
          autoPlay
          playsInline
          muted
          className="absolute top-0 left-0 w-full h-full object-cover"
          style={{ display: isCameraActive ? 'block' : 'none' }}
        />

        {/* Overlay for status indicators */}
        {isCameraActive && (
          <div className="absolute top-4 left-4 flex space-x-2 z-10">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Camera Not Active Overlay */}
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            <div className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Camera Not Active</p>
              <p className="text-sm text-gray-400">Please start the camera to begin live detection.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;