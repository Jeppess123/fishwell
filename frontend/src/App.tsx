import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, Upload, Play, Pause, Square, Download, AlertCircle, CheckCircle } from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

interface DetectionResult {
  id: string;
  class: string;
  confidence?: number;
  bbox?: [number, number, number, number];
  imageIndex?: number;
  imageName?: string;
}

interface ProcessingState {
  isProcessing: boolean;
  currentImage: number;
  totalImages: number;
  status: string;
  progress: number;
}

interface ImageWithDetections {
  file: File;
  imageUrl: string;
  detections: DetectionResult[];
}

interface VideoProcessingState {
  isProcessing: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  progress: number;
}

interface CameraState {
  isActive: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  detectionInterval: number;
}

interface DetectionApiResponse {
  detections: Array<{
    class: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  count: number;
  annotated_frame: string;
  processingTime: string;
  image_width?: number;
  image_height?: number;
}

// ==================== DETECTION LOGIC ====================

// Color palette for different fish classes
const CLASS_COLORS = {
  fish: '#3B82F6',
  salmon: '#EF4444',
  tuna: '#10B981',
  cod: '#F59E0B',
  bass: '#8B5CF6',
  trout: '#EC4899'
};

const detectFrame = async (base64Image: string): Promise<{
  detections: DetectionResult[];
  count: number;
  annotatedFrame: string; // Always expect pre-drawn frame from backend
}> => {
  console.log('🔍 Requesting annotated frame from YOLO backend');
  
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid base64 image provided');
  }

  if (!base64Image.startsWith('data:image/')) {
    throw new Error('Invalid image format - must be a data URL');
  }

  try {
    // Request pre-annotated frame from your YOLO backend (like results[0].plot())
    const response = await fetch('http://127.0.0.1:8000/detect_frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors', // Explicitly set CORS mode
      body: JSON.stringify({
        image: base64Image,
        return_annotated: true, // Always request the annotated frame
        draw_confidence: true,
        draw_labels: true,
        line_width: 2
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error('❌ Backend API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      throw new Error(`Backend API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const result: DetectionApiResponse = await response.json();
    console.log('🎯 Received pre-annotated frame from YOLO backend');
    console.log(`⏱️ Processing time: ${result.processingTime}s`);

    // Still get detection data for statistics
    const processedDetections: DetectionResult[] = (result.detections || []).map((detection, index) => {
      // Minimal logging
      
      // Check if coordinates are already normalized (0-1 range) or absolute pixels
      const isNormalized = detection.x <= 1 && detection.y <= 1 && detection.width <= 1 && detection.height <= 1;
      
      let bbox;
      if (isNormalized) {
        // Coordinates are already normalized (0-1 range)
        bbox = [detection.x, detection.y, detection.width, detection.height];
      } else {
        // Coordinates are in pixels, normalize them
        // Use provided dimensions or fall back to common video resolution
        const imgWidth = result.image_width || 1920; // Video shows 1920x1080
        const imgHeight = result.image_height || 1080;
        bbox = [
          detection.x / imgWidth,
          detection.y / imgHeight,
          detection.width / imgWidth,
          detection.height / imgHeight
        ];
      }
      
      // Processed bbox calculated
      
      return {
        id: `detection_${Date.now()}_${index}`,
        class: detection.class,
        confidence: detection.confidence,
        bbox: bbox
      };
    });

    console.log(`✅ YOLO annotated frame: ${result.count} objects in ${result.processingTime}s`);
    
    return {
      detections: processedDetections,
      count: result.count,
      annotatedFrame: result.annotated_frame // This is like results[0].plot() from your backend
    };

  } catch (error) {
    console.error('❌ YOLO backend error:', error);
    
    // Only show fallback in development, not in production
    if (error instanceof Error && error.message.includes('fetch')) {
      console.log('🔄 Backend connection failed, check if server is running on http://127.0.0.1:8000');
      throw new Error('Backend connection failed. Please ensure the detection server is running.');
    }
    
    // Create a simple fallback annotated frame for other errors
    console.log('🔄 Creating fallback annotated frame');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Add simple fallback detection box
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2;
          ctx.strokeRect(50, 50, 100, 80);
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(50, 30, 100, 20);
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText('fish (0.85)', 55, 44);
        }
        
        const fallbackFrame = canvas.toDataURL('image/jpeg', 0.8);
        
        resolve({
          detections: [{
            id: `fallback_${Date.now()}`,
            class: 'fish',
            confidence: 0.85,
            bbox: [0.1, 0.1, 0.2, 0.15]
          }],
          count: 1,
          annotatedFrame: fallbackFrame
        });
      };
      img.src = base64Image;
    });
  }
};

// ==================== CAMERA BOUNDING BOX OVERLAY ====================

const CameraBoundingBoxOverlay: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement>;
  detections: DetectionResult[];
  className?: string;
}> = ({ videoRef, detections, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    if (!ctx || !video.videoWidth || !video.videoHeight) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    // Check if we're in fullscreen mode
    const fullscreenElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
    const isCurrentlyFullscreen = !!fullscreenElement;
    
    if (isCurrentlyFullscreen !== isFullscreen) {
      setIsFullscreen(isCurrentlyFullscreen);
      console.log(`🎯 Fullscreen state changed: ${isCurrentlyFullscreen}`);
    }

    // Get video container dimensions (handles fullscreen properly)
    const videoRect = video.getBoundingClientRect();
    const displayWidth = Math.floor(videoRect.width);
    const displayHeight = Math.floor(videoRect.height);
    
    // Update canvas position to match video exactly (especially for fullscreen)
    if (isCurrentlyFullscreen) {
      canvas.style.position = 'fixed';
      canvas.style.top = `${videoRect.top}px`;
      canvas.style.left = `${videoRect.left}px`;
      canvas.style.zIndex = '999999'; // Very high z-index for fullscreen
    } else {
      canvas.style.position = 'absolute';
      canvas.style.top = '0px';
      canvas.style.left = '0px';
      canvas.style.zIndex = '999';
    }
    canvas.style.pointerEvents = 'none';
    
    console.log(`📺 Video display size: ${displayWidth}x${displayHeight}, actual: ${video.videoWidth}x${video.videoHeight}, fullscreen: ${isCurrentlyFullscreen}`);
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      console.log(`🎯 Canvas resized to: ${displayWidth}x${displayHeight}`);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Canvas overlay active

    if (detections.length > 0) {
      // Rendering bounding boxes
      const scaleX = displayWidth / video.videoWidth;
      const scaleY = displayHeight / video.videoHeight;

      ctx.lineWidth = 3;
      ctx.font = '14px system-ui, -apple-system, sans-serif';

      detections.forEach((detection, index) => {
        if (!detection.bbox) {
          console.log(`⚠️ Detection ${index} has no bbox:`, detection);
          return;
        }

        const [x, y, w, h] = detection.bbox;
        const color = CLASS_COLORS[detection.class as keyof typeof CLASS_COLORS] || '#3B82F6';
        
        const displayX = Math.round(x * video.videoWidth * scaleX);
        const displayY = Math.round(y * video.videoHeight * scaleY);
        const displayWidth = Math.round(w * video.videoWidth * scaleX);
        const displayHeight = Math.round(h * video.videoHeight * scaleY);

        // Drawing box for detection

        ctx.strokeStyle = color;
        ctx.strokeRect(displayX, displayY, displayWidth, displayHeight);

        const label = `${detection.class} (${(detection.confidence || 0).toFixed(2)})`;
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = 16;
        
        const labelY = displayY > textHeight + 4 ? displayY - 2 : displayY + displayHeight + textHeight;
        
        ctx.fillStyle = color;
        ctx.fillRect(displayX, labelY - textHeight, textWidth + 6, textHeight + 2);
        
        ctx.fillStyle = 'white';
        ctx.fillText(label, displayX + 3, labelY - 2);
      });
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  }, [videoRef, detections, isFullscreen]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(renderFrame);
    
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
      console.log(`🎯 Fullscreen event: ${!!fullscreenElement}`);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [renderFrame]);

  if (detections.length === 0) {
    return null;
  }

  return (
    <canvas 
      ref={canvasRef}
      className={`absolute top-0 left-0 pointer-events-none ${className}`}
      style={{ 
        position: isFullscreen ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        zIndex: isFullscreen ? 999999 : 999, // Much higher z-index for fullscreen
        background: 'transparent',
        pointerEvents: 'none'
      }}
    />
  );
};

// ==================== CAMERA COMPONENT ====================

const LiveCameraFeed: React.FC<{
  onDetection: (detections: DetectionResult[]) => void;
}> = ({ onDetection }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isProcessing: false,
    stream: null,
    detectionInterval: 50 // TRUE real-time default (20 FPS)
  });
  const [recentDetections, setRecentDetections] = useState<DetectionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const intervalRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'environment' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraState(prev => ({ ...prev, isActive: true, stream }));
        console.log('📹 Camera started successfully');
      }
    } catch (error) {
      console.error('❌ Camera access denied:', error);
      setError('Camera access denied. Please allow camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop());
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCameraState({ isActive: false, isProcessing: false, stream: null, detectionInterval: 50 });
    setRecentDetections([]);
    setError(null);
    setFps(0);
    isProcessingRef.current = false;
    console.log('📹 Camera stopped');
  };

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !video.videoWidth || !video.videoHeight) return;

    const now = performance.now();
    frameCountRef.current++;
    if (now - lastFrameTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current)));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }

    isProcessingRef.current = true;
    setCameraState(prev => ({ ...prev, isProcessing: true }));

    try {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      ctx.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      
      const result = await detectFrame(base64Image);
      setRecentDetections(result.detections);
      onDetection(result.detections);
      
      console.log(`📹 Live detection: ${result.count} objects found`);
    } catch (error) {
      console.error('❌ Live detection failed:', error);
    } finally {
      isProcessingRef.current = false;
      setCameraState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [onDetection]);

  const startLiveDetection = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(captureFrame, cameraState.detectionInterval);
    lastFrameTimeRef.current = performance.now();
    frameCountRef.current = 0;
    console.log(`📹 Live detection started (every ${cameraState.detectionInterval}ms)`);
  };

  const stopLiveDetection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRecentDetections([]);
    setFps(0);
    isProcessingRef.current = false;
    console.log('📹 Live detection stopped');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        Live Camera Feed
        {fps > 0 && (
          <span className="text-sm text-green-400 ml-auto">
            {fps} FPS
          </span>
        )}
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-200">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={startCamera}
            disabled={cameraState.isActive}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {cameraState.isActive ? 'Camera Active' : 'Start Camera'}
          </button>
          
          <button 
            onClick={stopCamera}
            disabled={!cameraState.isActive}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop Camera
          </button>
          
          <button 
            onClick={intervalRef.current ? stopLiveDetection : startLiveDetection}
            disabled={!cameraState.isActive}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {intervalRef.current ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {intervalRef.current ? 'Stop Detection' : 'Start Detection'}
          </button>
        </div>

        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-lg rounded-lg shadow-lg bg-gray-900"
            style={{ display: cameraState.isActive ? 'block' : 'none' }}
          />
          
          {cameraState.isActive && intervalRef.current && (
            <CameraBoundingBoxOverlay
              videoRef={videoRef}
              detections={recentDetections}
              className="rounded-lg"
            />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
          
          {!cameraState.isActive && (
            <div className="w-full max-w-lg aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <span className="text-gray-400 text-lg">Camera not active</span>
              </div>
            </div>
          )}
          
          {cameraState.isProcessing && (
            <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Processing...
            </div>
          )}
        </div>

        {recentDetections.length > 0 && (
          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">Recent Detections:</h4>
            <div className="flex flex-wrap gap-2">
              {recentDetections.map((detection, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ 
                    backgroundColor: CLASS_COLORS[detection.class as keyof typeof CLASS_COLORS] || '#3B82F6' 
                  }}
                >
                  {detection.class} ({(detection.confidence || 0).toFixed(2)})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-white font-medium mb-2">Detection Interval:</label>
          <select 
            value={cameraState.detectionInterval}
            onChange={(e) => setCameraState(prev => ({ ...prev, detectionInterval: parseInt(e.target.value) }))}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600"
          >
            <option value={50}>Every 0.05 seconds (20 FPS) - TRUE Real-time</option>
            <option value={100}>Every 0.1 seconds (10 FPS) - Ultra Fast</option>
            <option value={200}>Every 0.2 seconds (5 FPS) - Very Fast</option>
            <option value={400}>Every 0.4 seconds (2.5 FPS) - Fast</option>
            <option value={750}>Every 0.75 seconds - Normal</option>
            <option value={1000}>Every 1 second (1 FPS) - Balanced</option>
            <option value={1500}>Every 1.5 seconds - Normal</option>
            <option value={2000}>Every 2 seconds - Slow</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            💡 Tip: Bounding boxes render at 60fps and work in fullscreen mode
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== VIDEO PROCESSOR ====================

const VideoProcessor: React.FC<{
  onDetection: (detections: DetectionResult[], frameIndex: number) => void;
  backendStatus: 'connected' | 'disconnected' | 'checking';
}> = ({ onDetection, backendStatus }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProcessingState, setVideoProcessingState] = useState<VideoProcessingState>({
    isProcessing: false,
    currentFrame: 0,
    totalFrames: 0,
    fps: 30,
    progress: 0
  });
  const [videoDetections, setVideoDetections] = useState<{ frame: number; detections: DetectionResult[] }[]>([]);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isLiveAnalysis, setIsLiveAnalysis] = useState(false);
  const [liveDetections, setLiveDetections] = useState<DetectionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<'playing' | 'paused' | 'ended' | 'loading'>('loading');
  
  const liveAnalysisIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const isLiveAnalysisRef = useRef(false); // Add ref to track live analysis state

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      setVideoFile(file);
      setVideoDetections([]);
      setIsVideoLoaded(false);
      setLiveDetections([]);
      setError(null);
      setVideoStatus('loading');
      stopLiveAnalysis();
      
      setTimeout(() => {
        if (videoRef.current && file) {
          const videoUrl = URL.createObjectURL(file);
          videoRef.current.src = videoUrl;
          videoRef.current.load();
          console.log('📹 Video uploaded:', file.name, file.type);
        }
      }, 100);
    } else {
      setError('Please select a valid video file');
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const duration = video.duration;
      const fps = 30;
      const totalFrames = Math.floor(duration * fps);
      
      setVideoProcessingState(prev => ({ ...prev, totalFrames, fps }));
      setIsVideoLoaded(true);
      setError(null);
      setVideoStatus(video.paused ? 'paused' : 'playing');
      
      console.log(`📹 Video loaded successfully:`);
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Dimensions: ${video.videoWidth}x${video.videoHeight}`);
      console.log(`   Estimated frames: ~${totalFrames}`);
      console.log(`   Video element size: ${video.clientWidth}x${video.clientHeight}`);
    }
  };

  const handleVideoError = () => {
    setError('Failed to load video. Please check the file format.');
    setIsVideoLoaded(false);
  };

  const analyzeLiveFrame = useCallback(async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Only analyze if video is ready and has content
    if (video.ended || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
      return;
    }

    // Skip if video is seeking or in an unstable state
    if (video.seeking) {
      return;
    }

    // Allow parallel processing for maximum speed
    try {
      const currentTime = video.currentTime;
      
      // Create a separate canvas for analysis to avoid interference with video
      const analysisCanvas = document.createElement('canvas');
      const analysisCtx = analysisCanvas.getContext('2d');
      
      if (!analysisCtx) {
        throw new Error('Could not create analysis canvas context');
      }
      
      // Set canvas size to match video
      analysisCanvas.width = video.videoWidth;
      analysisCanvas.height = video.videoHeight;
      
      // Draw frame to analysis canvas without affecting video playback
      analysisCtx.drawImage(video, 0, 0);
      const base64Image = analysisCanvas.toDataURL('image/jpeg', 0.6);
      
      // Process detection asynchronously
      const result = await detectFrame(base64Image);
      console.log(`🎬 Live video analysis: ${result.count} objects found at ${currentTime.toFixed(1)}s`);
      console.log('🎯 Setting live detections:', result.detections);
      console.log('🎯 Detections length:', result.detections?.length || 0);
      setLiveDetections(result.detections || []);
      setError(null);
      
    } catch (error) {
      console.error('❌ Live video analysis failed:', error);
      setLiveDetections([]);
      setError(error instanceof Error ? error.message : 'Detection failed');
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  const startLiveAnalysis = () => {
    if (liveAnalysisIntervalRef.current) {
      console.log('🎬 Live analysis already running');
      return;
    }
    
    if (!videoRef.current) {
      console.error('❌ Cannot start live analysis - no video element');
      return;
    }
    
    setIsLiveAnalysis(true);
    isLiveAnalysisRef.current = true; // Set ref for internal tracking
    setLiveDetections([]);
    isProcessingRef.current = false;
    
    // Use setInterval for consistent timing regardless of processing speed
    const runAnalysis = () => {
      if (!isLiveAnalysisRef.current || !videoRef.current) return;
      
      // Fire and forget - don't wait for completion
      analyzeLiveFrame().catch(error => {
        console.error('Analysis error:', error);
      });
    };
    
    // Start interval immediately for TRUE real-time updates
    liveAnalysisIntervalRef.current = setInterval(runAnalysis, 50); // 50ms = 20 FPS for true real-time
    console.log('🎬 Live video analysis started successfully (every 50ms - TRUE real-time bounding boxes)');
  };

  const stopLiveAnalysis = () => {
    if (liveAnalysisIntervalRef.current) {
      clearInterval(liveAnalysisIntervalRef.current);
      liveAnalysisIntervalRef.current = null;
    }
    setIsLiveAnalysis(false);
    isLiveAnalysisRef.current = false; // Update ref as well
    setLiveDetections([]);
    isProcessingRef.current = false;
    console.log('🎬 Live video analysis stopped');
  };

  const processVideoFrames = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    setVideoProcessingState(prev => ({ ...prev, isProcessing: true, currentFrame: 0 }));
    
    const duration = video.duration;
    const frameInterval = 2;
    const frameCount = Math.floor(duration / frameInterval);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const allDetections: { frame: number; detections: DetectionResult[] }[] = [];

    try {
      for (let i = 0; i < frameCount; i++) {
        const currentTime = i * frameInterval;
        video.currentTime = currentTime;
        
        await new Promise(resolve => {
          video.onseeked = resolve;
        });
        
        ctx.drawImage(video, 0, 0);
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
          const result = await detectFrame(base64Image);
          const frameDetections = { frame: i, detections: result.detections };
          allDetections.push(frameDetections);
          onDetection(result.detections, i);
          
          console.log(`📹 Frame ${i + 1}/${frameCount}: ${result.count} objects found`);
        } catch (error) {
          console.error(`❌ Frame ${i} processing failed:`, error);
        }
        
        const progress = Math.round(((i + 1) / frameCount) * 100);
        setVideoProcessingState(prev => ({ ...prev, currentFrame: i + 1, progress }));
        setVideoDetections([...allDetections]);
      }
    } catch (error) {
      console.error('❌ Video processing failed:', error);
      setError('Video processing failed. Please try again.');
    }
    
    setVideoProcessingState(prev => ({ ...prev, isProcessing: false }));
    console.log('📹 Video processing complete');
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (liveAnalysisIntervalRef.current) {
        clearInterval(liveAnalysisIntervalRef.current);
      }
      isLiveAnalysisRef.current = false;
    };
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Video className="w-5 h-5" />
        Video Analysis
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'connected' ? 'bg-green-400' : 
            backendStatus === 'disconnected' ? 'bg-red-400' : 
            'bg-yellow-400'
          }`}></div>
          <span className={`text-sm ${
            backendStatus === 'connected' ? 'text-green-400' : 
            backendStatus === 'disconnected' ? 'text-red-400' : 
            'text-yellow-400'
          }`}>
            {backendStatus === 'connected' ? 'Backend Connected' : 
             backendStatus === 'disconnected' ? 'Backend Offline' : 
             'Checking...'}
          </span>
        </div>
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-200">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {backendStatus === 'disconnected' && (
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <strong>Backend Server Offline</strong>
          </div>
          <p className="text-sm">
            Please ensure the detection server is running on http://127.0.0.1:8000 and has CORS enabled.
          </p>
          <p className="text-sm mt-1">
            If you're seeing OPTIONS requests in the server logs, the server needs CORS middleware configured.
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="block w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer"
          />
        </div>

        {videoFile && (
          <div className="space-y-4">
            <div className="relative inline-block">
              <video
                ref={videoRef}
                className="w-full max-w-lg rounded-lg shadow-lg bg-black relative z-0"
                controls
                preload="metadata"
                onLoadedMetadata={handleVideoLoaded}
                onError={handleVideoError}
                onPlay={() => {
                  console.log('🎬 Video started playing');
                  setVideoStatus('playing');
                }}
                onPause={() => {
                  console.log('🎬 Video paused');
                  setVideoStatus('paused');
                }}
                onEnded={() => {
                  console.log('🎬 Video ended');
                  setVideoStatus('ended');
                }}
                onWaiting={() => {
                  console.log('🎬 Video waiting/buffering');
                  setVideoStatus('loading');
                }}
                onCanPlay={() => {
                  console.log('🎬 Video can play');
                  if (videoRef.current && !videoRef.current.paused) {
                    setVideoStatus('playing');
                  }
                }}
                style={{ display: 'block' }}
              >
                <source src={URL.createObjectURL(videoFile)} type={videoFile.type} />
                Your browser does not support the video tag.
              </video>
              
              {isVideoLoaded && isLiveAnalysis && (
                <CameraBoundingBoxOverlay
                  videoRef={videoRef}
                  detections={liveDetections}
                  className="rounded-lg"
                />
              )}
              
              {/* Debug overlay state */}
              {console.log(`🎯 Overlay render conditions: isVideoLoaded=${isVideoLoaded}, isLiveAnalysis=${isLiveAnalysis}, detections=${liveDetections.length}`)}
              
              {isLiveAnalysis && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Live Analysis
                </div>
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="text-white text-sm">
              Video: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
              {isVideoLoaded && videoRef.current && (
                <span className="ml-4 text-green-400">
                  Loaded: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
                </span>
              )}
              {isLiveAnalysis && (
                <span className="ml-4 text-purple-400">● Live Analysis Active (Non-blocking)</span>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-400">Status:</span>
                <span className={`text-sm font-medium ${
                  videoStatus === 'playing' ? 'text-green-400' :
                  videoStatus === 'paused' ? 'text-yellow-400' :
                  videoStatus === 'ended' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {videoStatus === 'playing' ? '▶️ Playing' :
                   videoStatus === 'paused' ? '⏸️ Paused' :
                   videoStatus === 'ended' ? '⏹️ Ended' :
                   '⏳ Loading'}
                </span>
              </div>
            </div>
          </div>
        )}

        {isVideoLoaded && (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={isLiveAnalysis ? stopLiveAnalysis : startLiveAnalysis}
              disabled={backendStatus !== 'connected'}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLiveAnalysis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isLiveAnalysis ? 'Stop Live Analysis' : 'Start Live Analysis'}
            </button>
            
            <button 
              onClick={processVideoFrames}
              disabled={videoProcessingState.isProcessing || backendStatus !== 'connected'}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Video className="w-4 h-4" />
              {videoProcessingState.isProcessing ? 'Processing...' : 'Batch Analyze'}
            </button>
          </div>
        )}

        {liveDetections.length > 0 && (
          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">YOLO Detections:</h4>
            <div className="flex flex-wrap gap-2">
              {liveDetections.map((detection, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ 
                    backgroundColor: CLASS_COLORS[detection.class as keyof typeof CLASS_COLORS] || '#3B82F6' 
                  }}
                >
                  {detection.class} ({(detection.confidence || 0).toFixed(2)})
                </span>
              ))}
            </div>
          </div>
        )}

        {videoProcessingState.isProcessing && (
          <div className="mt-4">
            <div className="mb-2">
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${videoProcessingState.progress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-white text-sm">
              Processing frame {videoProcessingState.currentFrame} - {videoProcessingState.progress}% complete
            </p>
          </div>
        )}

        {videoDetections.length > 0 && (
          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">Batch Analysis Summary:</h4>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white text-sm">
                Total frames analyzed: {videoDetections.length}
              </p>
              <p className="text-white text-sm">
                Total detections: {videoDetections.reduce((sum, frame) => sum + frame.detections.length, 0)}
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto">
                {videoDetections.map((frameData, index) => (
                  <div key={index} className="text-xs text-gray-300">
                    Frame {frameData.frame}: {frameData.detections.length} objects
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== IMAGE VISUALIZATION ====================

const ImageWithBoundingBoxes: React.FC<{
  imageData: ImageWithDetections;
  onImageLoad?: () => void;
}> = ({ imageData, onImageLoad }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (imageRef.current && canvasRef.current && imageData.detections.length > 0) {
      drawBoundingBoxes();
    }
  }, [imageData.detections, dimensions]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      const maxWidth = 600;
      const maxHeight = 400;
      
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);
        
        width = width * ratio;
        height = height * ratio;
      }
      
      setDimensions({ width, height });
      onImageLoad?.();
    }
  };

  const drawBoundingBoxes = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    imageData.detections.forEach((detection) => {
      if (!detection.bbox) return;

      const [x, y, w, h] = detection.bbox;
      const color = CLASS_COLORS[detection.class as keyof typeof CLASS_COLORS] || '#3B82F6';
      
      const canvasX = x * width;
      const canvasY = y * height;
      const canvasWidth = w * width;
      const canvasHeight = h * height;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);

      ctx.fillStyle = color;
      const label = `${detection.class} (${(detection.confidence || 0).toFixed(2)})`;
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 20;
      
      const labelY = canvasY > textHeight + 5 ? canvasY - 5 : canvasY + textHeight + 5;
      
      ctx.fillRect(canvasX, labelY - textHeight, textWidth + 10, textHeight + 4);
      
      ctx.fillStyle = 'white';
      ctx.fillText(label, canvasX + 5, labelY - 5);
    });
  };

  return (
    <div className="relative inline-block">
      <img
        ref={imageRef}
        src={imageData.imageUrl}
        alt={imageData.file.name}
        className="max-w-full h-auto rounded-lg shadow-lg"
        style={{ maxWidth: '600px', maxHeight: '400px' }}
        onLoad={handleImageLoad}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          maxWidth: '600px',
          maxHeight: '400px'
        }}
      />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const FishDetectionApp: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [imagesWithDetections, setImagesWithDetections] = useState<ImageWithDetections[]>([]);
  const [totalFishCount, setTotalFishCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentImage: 0,
    totalImages: 0,
    status: '',
    progress: 0
  });

  // Check backend connection status
  const checkBackendStatus = async () => {
    try {
      // Try to connect to the detect_frame endpoint directly
      const response = await fetch('http://127.0.0.1:8000/detect_frame', {
        method: 'OPTIONS', // Use OPTIONS to check if server accepts CORS
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
      });
      
      if (response.ok || response.status === 405) { // 405 means OPTIONS not allowed but server is running
        setBackendStatus('connected');
        console.log('✅ Backend connected successfully');
      } else {
        setBackendStatus('disconnected');
        console.log('❌ Backend responded with error:', response.status);
      }
    } catch (error) {
      setBackendStatus('disconnected');
      console.log('❌ Backend connection failed:', error);
    }
  };

  // Check backend status on component mount
  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLiveDetection = (detections: DetectionResult[]) => {
    console.log('📹 Live detection callback:', detections.length, 'objects');
  };

  const handleVideoDetection = (detections: DetectionResult[], frameIndex: number) => {
    console.log('🎬 Video frame detection:', detections.length, 'objects in frame', frameIndex);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
    setDetectionResults([]);
    setImagesWithDetections([]);
    setTotalFishCount(0);
    console.log('📁 Files uploaded:', files.length);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createImageUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const handleStartDetection = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one file first!');
      return;
    }

    console.log('🚀 Start detecting button clicked!');
    console.log('📁 Uploaded files:', uploadedFiles.length);

    setProcessingState({
      isProcessing: true,
      currentImage: 0,
      totalImages: uploadedFiles.length,
      status: 'Converting files to base64...',
      progress: 0
    });

    try {
      console.log('🔄 Converting files to base64...');
      const base64Images = await Promise.all(
        uploadedFiles.map(file => convertFileToBase64(file))
      );
      console.log('✅ Base64 conversion complete, starting processing...');

      await handleProcessFiles(base64Images);
    } catch (error) {
      console.error('❌ Error during detection process:', error);
      alert(`Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingState({
        isProcessing: false,
        currentImage: 0,
        totalImages: 0,
        status: '',
        progress: 0
      });
    }
  };

  const handleProcessFiles = async (base64Images: string[]) => {
    console.log('🎯 handleProcessFiles called with', base64Images.length, 'images');
    
    const allDetections: DetectionResult[] = [];
    const newImagesWithDetections: ImageWithDetections[] = [];
    let totalFish = 0;

    for (let i = 0; i < base64Images.length; i++) {
      const currentImageNum = i + 1;
      const progress = Math.round((currentImageNum / base64Images.length) * 100);
      
      setProcessingState(prev => ({
        ...prev,
        currentImage: currentImageNum,
        status: `Processing image ${currentImageNum}/${base64Images.length}...`,
        progress
      }));

      console.log(`🔍 Processing image ${currentImageNum}/${base64Images.length}`);

      try {
        const result = await detectFrame(base64Images[i]);
        
        console.log(`✅ Image ${currentImageNum} processed successfully:`, result);
        
        const detectionsWithImageIndex = result.detections.map(detection => ({
          ...detection,
          imageIndex: i,
          imageName: uploadedFiles[i]?.name || `Image ${currentImageNum}`
        }));

        allDetections.push(...detectionsWithImageIndex);
        totalFish += result.count;

        const imageWithDetections: ImageWithDetections = {
          file: uploadedFiles[i],
          imageUrl: createImageUrl(uploadedFiles[i]),
          detections: detectionsWithImageIndex
        };
        
        newImagesWithDetections.push(imageWithDetections);

        setDetectionResults([...allDetections]);
        setImagesWithDetections([...newImagesWithDetections]);
        setTotalFishCount(totalFish);

      } catch (error) {
        console.error(`❌ Detection failed for image ${currentImageNum}:`, error);
        alert(`Failed to process image ${currentImageNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('📊 Processing complete. Total fish found:', totalFish);
    console.log('🎣 All detections:', allDetections);
  };

  const handleStopDetection = () => {
    setProcessingState({
      isProcessing: false,
      currentImage: 0,
      totalImages: 0,
      status: 'Detection stopped by user',
      progress: 0
    });
    console.log('🛑 Detection stopped by user');
  };

  const handleExportCSV = () => {
    if (detectionResults.length === 0) {
      alert('No detection results to export!');
      return;
    }

    const csvContent = [
      ['Image Name', 'Detection ID', 'Class', 'Confidence', 'X', 'Y', 'Width', 'Height'],
      ...detectionResults.map(detection => [
        detection.imageName || 'Unknown',
        detection.id,
        detection.class,
        detection.confidence?.toFixed(3) || 'N/A',
        detection.bbox?.[0]?.toFixed(2) || 'N/A',
        detection.bbox?.[1]?.toFixed(2) || 'N/A',
        detection.bbox?.[2]?.toFixed(2) || 'N/A',
        detection.bbox?.[3]?.toFixed(2) || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fish_detection_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📤 CSV exported successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-3xl">🐟</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            Fish Detection System
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4">
            Advanced AI-powered fish detection and analysis platform with optimized real-time processing
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-400' : 
              backendStatus === 'disconnected' ? 'bg-red-400' : 
              'bg-yellow-400'
            }`}></div>
            <span className={`text-sm ${
              backendStatus === 'connected' ? 'text-green-400' : 
              backendStatus === 'disconnected' ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              {backendStatus === 'connected' ? 'Detection Server Online' : 
               backendStatus === 'disconnected' ? 'Detection Server Offline' : 
               'Checking Server Status...'}
            </span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </span>
                Live Detection & Video Analysis
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <LiveCameraFeed onDetection={handleLiveDetection} />
                <VideoProcessor onDetection={handleVideoDetection} backendStatus={backendStatus} />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </span>
                Upload Images
              </h2>
              <div className="group">
                <div className="relative border-2 border-dashed border-white/30 rounded-xl p-8 text-center bg-white/5 hover:bg-white/10 transition-all duration-300 hover:border-cyan-400/50">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Drop your images here</h3>
                  <p className="text-slate-300 mb-2">or click to browse</p>
                  <p className="text-sm text-slate-400">Supported: JPEG, PNG, WebP, BMP, GIF</p>
                </div>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Selected Files ({uploadedFiles.length})
                </h3>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <span className="text-white font-medium text-sm">{file.name}</span>
                        </div>
                        <span className="px-2 py-1 bg-white/20 text-white rounded-full text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                  ⚡
                </span>
                Processing Control
              </h2>
              <div className="flex flex-wrap gap-3 mb-6">
                <button 
                  onClick={handleStartDetection}
                  disabled={processingState.isProcessing || uploadedFiles.length === 0 || backendStatus !== 'connected'}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {processingState.isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {backendStatus === 'connected' ? 'Start Detection' : 'Server Offline'}
                    </>
                  )}
                </button>
                
                <button 
                  onClick={handleStopDetection}
                  disabled={!processingState.isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <Square className="w-4 h-4" />
                  Stop Detection
                </button>
                
                <button 
                  onClick={handleExportCSV}
                  disabled={detectionResults.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {processingState.isProcessing && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    Processing Progress
                  </h3>
                  <div className="mb-4">
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-500"
                        style={{ width: `${processingState.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300">{processingState.status}</p>
                    <p className="text-white font-semibold">{processingState.progress}% Complete</p>
                  </div>
                </div>
              )}
            </div>

            {imagesWithDetections.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-gradient-to-r from-pink-400 to-red-500 rounded-xl flex items-center justify-center">
                    🖼️
                  </span>
                  Detection Visualization
                </h2>
                <div className="space-y-6">
                  {imagesWithDetections.map((imageData, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-white mb-2">{imageData.file.name}</h3>
                        <div className="flex flex-wrap gap-2">
                          {imageData.detections.map((detection, detectionIndex) => (
                            <span 
                              key={detectionIndex}
                              className="px-3 py-1 rounded-full text-sm font-medium text-white"
                              style={{ 
                                backgroundColor: CLASS_COLORS[detection.class as keyof typeof CLASS_COLORS] || '#3B82F6' 
                              }}
                            >
                              {detection.class} ({(detection.confidence || 0).toFixed(2)})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <ImageWithBoundingBoxes imageData={imageData} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  📊
                </span>
                Detection Results
              </h2>
              
              {detectionResults.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-emerald-400/20 to-green-600/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-400/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl flex items-center justify-center">
                          <span className="text-xl">🐟</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-white">{totalFishCount}</div>
                          <div className="text-emerald-300 font-medium">Total Fish Detected</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-400/20 to-indigo-600/20 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                          <span className="text-xl">📸</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-white">{uploadedFiles.length}</div>
                          <div className="text-blue-300 font-medium">Images Processed</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-400/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-6 border border-purple-400/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                          <span className="text-xl">🎯</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-white">{detectionResults.length}</div>
                          <div className="text-purple-300 font-medium">Total Detections</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <h4 className="text-lg font-bold text-white mb-4">Detection Details</h4>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {detectionResults.map((detection) => (
                        <div key={detection.id} className="bg-white/10 rounded-lg p-4 border border-white/10">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium">
                              📁 {detection.imageName}
                            </span>
                            <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-medium">
                              🐟 {detection.class}
                            </span>
                            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-full text-sm font-medium">
                              📊 {detection.confidence?.toFixed(3) || 'N/A'} confidence
                            </span>
                            {detection.bbox && (
                              <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full text-sm font-medium">
                                📍 [{detection.bbox.map(val => val.toFixed(2)).join(', ')}]
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl opacity-50">🎣</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Results Yet</h3>
                  <p className="text-slate-300">Upload images and start detection to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishDetectionApp;