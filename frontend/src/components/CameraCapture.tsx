<<<<<<< HEAD
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Play, Square, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface CameraCaptureProps {
  onFrameCapture: (imageData: string) => void;
  isProcessing: boolean;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onFrameCapture,
  isProcessing,
  disabled = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices:', err);
      }
    };

    getDevices();
  }, [selectedDevice]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  }, [selectedDevice]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCapturing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    onFrameCapture(imageData);
  }, [onFrameCapture]);

  const startCapturing = useCallback(() => {
    if (!isCameraActive) return;

    setIsCapturing(true);
    intervalRef.current = setInterval(captureFrame, 500);
  }, [isCameraActive, captureFrame]);

  const stopCapturing = useCallback(() => {
    setIsCapturing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const takeSnapshot = useCallback(() => {
    captureFrame();
  }, [captureFrame]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {!isCameraActive ? (
=======
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
>>>>>>> 02b14d68 (kommitter prosjektet)
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startCamera}
<<<<<<< HEAD
            disabled={disabled}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
=======
            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg"
>>>>>>> 02b14d68 (kommitter prosjektet)
          >
            <Camera className="w-5 h-5" />
            <span>Start Camera</span>
          </motion.button>
<<<<<<< HEAD
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopCamera}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CameraOff className="w-5 h-5" />
            <span>Stop Camera</span>
          </motion.button>
        )}

        {isCameraActive && !isCapturing && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startCapturing}
            disabled={isProcessing}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            <span>Start Detection</span>
          </motion.button>
        )}

        {isCameraActive && isCapturing && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopCapturing}
            className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Square className="w-5 h-5" />
            <span>Stop Detection</span>
          </motion.button>
        )}

        {isCameraActive && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={takeSnapshot}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Download className="w-5 h-5" />
            <span>Snapshot</span>
          </motion.button>
=======
>>>>>>> 02b14d68 (kommitter prosjektet)
        )}
      </div>

      {/* Camera Device Selection */}
      {devices.length > 1 && (
        <div className="flex items-center space-x-3">
<<<<<<< HEAD
          <label className="text-sm font-medium text-gray-700">Camera:</label>
          <select
            value={selectedDevice}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDevice(e.target.value)}
            disabled={isCameraActive}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

=======
          {/* ...device selector... */}
        </div>
      )}

      {/* Error Display */}
>>>>>>> 02b14d68 (kommitter prosjektet)
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

<<<<<<< HEAD
      <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
=======
      {/* Camera Feed with overlays */}
      <div className="relative w-full max-w-xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
>>>>>>> 02b14d68 (kommitter prosjektet)
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
<<<<<<< HEAD
          className="w-full h-auto max-h-96 object-cover"
          style={{ display: isCameraActive ? 'block' : 'none' }}
        />

        {!isCameraActive && (
          <div className="aspect-video flex items-center justify-center bg-gray-100 text-gray-500">
=======
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
>>>>>>> 02b14d68 (kommitter prosjektet)
            <div className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Camera Not Active</p>
              <p className="text-sm">Click "Start Camera" to begin</p>
            </div>
          </div>
        )}
<<<<<<< HEAD

        {isCameraActive && (
          <div className="absolute top-4 left-4 flex space-x-2">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
            {isCapturing && (
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>Detecting</span>
              </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
=======
      </div>
>>>>>>> 02b14d68 (kommitter prosjektet)
    </div>
  );
};

<<<<<<< HEAD
export default CameraCapture;
=======
export default CameraCapture;
>>>>>>> 02b14d68 (kommitter prosjektet)
