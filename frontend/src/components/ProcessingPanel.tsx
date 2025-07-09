import React from 'react';
import { Play, Pause, Square, Download, BarChart3, Clock, Fish } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProcessingStats } from '../types/detection';

interface ProcessingPanelProps {
  isProcessing: boolean;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onExportResults: () => void;
  stats: ProcessingStats | null;
  progress: number;
}

const ProcessingPanel: React.FC<ProcessingPanelProps> = ({
  isProcessing,
  onStartProcessing,
  onStopProcessing,
  onExportResults,
  stats,
  progress
}) => {
  // Midlertidig pauseknapp – du kan koble til faktisk logikk senere
  const handlePause = () => {
    console.log('Pause clicked – implementer faktisk pausefunksjonalitet her');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>Processing Control</span>
        </h2>
      </div>

      <div className="space-y-6">
        {/* Control Buttons */}
        <div className="flex flex-wrap gap-3">
          {!isProcessing ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartProcessing}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Play className="w-5 h-5" />
              <span>Start Detection</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePause}
                className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStopProcessing}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Square className="w-5 h-5" />
                <span>Stop Detection</span>
              </motion.button>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onExportResults}
            disabled={!stats || stats.processedFrames === 0}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </motion.button>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processing Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Fish className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Fish</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.totalFishDetected}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Avg per Frame</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {stats.averageFishPerFrame.toFixed(1)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Play className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Frames</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {stats.processedFrames}/{stats.totalFrames}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Time</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {stats.processingTime.toFixed(1)}s
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingPanel;
