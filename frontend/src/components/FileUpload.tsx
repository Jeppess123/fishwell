import React, { useCallback, useState } from 'react';
import { Upload, Video, Image, FolderOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes: string;
  multiple?: boolean;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  acceptedTypes = '',
  multiple = false,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
    onFilesSelected(files);
  }, [onFilesSelected, disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    onFilesSelected(files);
  }, [onFilesSelected, disabled]);

  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  }, [selectedFiles, onFilesSelected]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-green-500" />;
    return <FolderOpen className="w-5 h-5 text-blue-500" />;
  };

  const typeDescription = acceptedTypes?.includes('video') ? 'videos or images' : 'files';

  return (
    <div className="space-y-4">
      <motion.div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragOver ? 'border-blue-400 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        <input
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="space-y-4">
          <motion.div
            animate={isDragOver ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
          </motion.div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {multiple ? 'Upload Files' : 'Upload File'}
            </h3>
            <p className="text-gray-500 text-sm">
              Drag and drop your {typeDescription} here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: {acceptedTypes?.split(',').join(', ') || 'any'}
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h4 className="font-medium text-gray-700">Selected Files:</h4>
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between bg-white border rounded-lg p-3 shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="font-medium text-gray-700 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
