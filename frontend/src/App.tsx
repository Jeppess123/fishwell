import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import LiveDetectionPanel from './components/LiveDetectionPanel';
import ProcessingPanel from './components/ProcessingPanel';
import ResultsViewer from './components/ResultsViewer';
import { FrameAnalysis, ProcessingStats, Detection } from './types/detection';
import { sendImageToBackend, processVideoWithBackend } from './utils/videoDetection';
import { calculateStats, exportToCSV, downloadCSV } from './utils/statsUtils';

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [results, setResults] = useState<FrameAnalysis[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setResults([]);
    setCurrentFrame(0);
    setStats(null);
    setProgress(0);
  }, []);

  const handleStartProcessing = useCallback(async () => {
    if (activeTab === 'upload' && selectedFiles.length === 0) return;

    setIsProcessing(true);
    setStopRequested(false);
    setResults([]);
    setProgress(0);
    const startTime = Date.now();

    if (activeTab === 'camera') {
      return;
    }

    const allFrames: FrameAnalysis[] = [];

    try {
      for (const file of selectedFiles) {
        if (file.type.startsWith('image/')) {
          const backendFrame = await sendImageToBackend(file);

          const frame: FrameAnalysis = {
            frameNumber: allFrames.length + 1,
            fishCount: backendFrame.fishCount,
            detections: backendFrame.detections,
            timestamp: new Date().toISOString(),
            imageData: {
              type: 'image',
              src: backendFrame.imageData,
            },
          };

          allFrames.push(frame);
          setResults([...allFrames]);
          setProgress((allFrames.length / selectedFiles.length) * 100);
          setCurrentFrame(allFrames.length - 1);
        } else if (file.type.startsWith('video/')) {
          await processVideoWithBackend(
            file,
            (videoProgress) => {
              const fileProgress = (allFrames.length / selectedFiles.length) * 100;
              const currentFileProgress = videoProgress / selectedFiles.length;
              setProgress(fileProgress + currentFileProgress);
            },
            (videoFrame: { fishCount: number; detections: Detection[]; imageData: string }) => {
              const frame: FrameAnalysis = {
                frameNumber: allFrames.length + 1,
                fishCount: videoFrame.fishCount,
                detections: videoFrame.detections,
                timestamp: new Date().toISOString(),
                imageData: {
                  type: 'video',
                  src: videoFrame.imageData,
                },
              };

              allFrames.push(frame);
              setResults([...allFrames]);
              setCurrentFrame(allFrames.length - 1);
            },
            () => stopRequested
          );
        }
      }

      const processingTime = (Date.now() - startTime) / 1000;
      const finalStats = calculateStats(allFrames, processingTime);
      setStats(finalStats);
      setProgress(100);
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      if (activeTab === 'upload') {
        setIsProcessing(false);
      }
    }
  }, [selectedFiles, activeTab, stopRequested]);

  const handleStopProcessing = useCallback(() => {
    setStopRequested(true);
    setIsProcessing(false);

    if (activeTab === 'camera' && results.length > 0) {
      const processingTime = 1;
      const finalStats = calculateStats(results, processingTime);
      setStats(finalStats);
    }
  }, [activeTab, results]);

  const handleExportResults = useCallback(() => {
    if (results.length === 0) return;

    const csvContent = exportToCSV(results);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const prefix = activeTab === 'camera' ? 'camera' : 'file';
    downloadCSV(csvContent, `fish_detection_${prefix}_${timestamp}.csv`);
  }, [results, activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'upload'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Upload Files
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'camera'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Live Camera
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Media</h2>
                  <FileUpload
                    onFilesSelected={handleFilesSelected}
                    acceptedTypes="video/*,image/*"
                    multiple={true}
                    disabled={isProcessing}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Live Camera</h2>
                  <LiveDetectionPanel
                    onFrameCapture={async (imageDataUrl: string) => {
                      try {
                        const blob = await (await fetch(imageDataUrl)).blob();
                        const formData = new FormData();
                        formData.append("file", blob, "frame.jpg");

                        const response = await fetch("http://localhost:8000/detect/", {
                          method: "POST",
                          body: formData,
                        });

                        const result = await response.json();

                        const frame: FrameAnalysis = {
                          frameNumber: results.length + 1,
                          fishCount: result.fishCount,
                          detections: result.detections,
                          timestamp: new Date().toISOString(),
                          imageData: {
                            type: 'image',
                            src: result.imageData,
                          },
                        };

                        setResults(prev => [...prev, frame]);
                        setCurrentFrame(results.length);
                      } catch (error) {
                        console.error("Live camera detection error:", error);
                      }
                    }}
                    isProcessing={isProcessing}
                  />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ProcessingPanel
                isProcessing={isProcessing}
                onStartProcessing={handleStartProcessing}
                onStopProcessing={handleStopProcessing}
                onExportResults={handleExportResults}
                stats={stats}
                progress={progress}
              />
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ResultsViewer
                results={results}
                currentFrame={currentFrame}
                onFrameChange={setCurrentFrame}
              />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
