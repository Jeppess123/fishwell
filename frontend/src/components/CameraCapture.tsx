import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const CameraCapture: React.FC = () => {
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
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError('Could not start camera.');
    }
  };

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
          ref={videoRef}
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
              <p className="text-sm">Click "Start Camera" to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;