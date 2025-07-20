import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Supported file types configuration
export const SUPPORTED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', category: 'Document', icon: '📄' },
  'application/msword': { ext: '.doc', category: 'Document', icon: '📄' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', category: 'Document', icon: '📄' },
  'text/plain': { ext: '.txt', category: 'Document', icon: '📄' },
  'text/markdown': { ext: '.md', category: 'Document', icon: '📄' },
  'application/rtf': { ext: '.rtf', category: 'Document', icon: '📄' },
  
  // Spreadsheets
  'application/vnd.ms-excel': { ext: '.xls', category: 'Spreadsheet', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', category: 'Spreadsheet', icon: '📊' },
  'text/csv': { ext: '.csv', category: 'Data', icon: '📊' },
  'application/json': { ext: '.json', category: 'Data', icon: '📊' },
  
  // Presentations
  'application/vnd.ms-powerpoint': { ext: '.ppt', category: 'Presentation', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: '.pptx', category: 'Presentation', icon: '📊' },
  
  // Images
  'image/png': { ext: '.png', category: 'Image', icon: '🖼️' },
  'image/jpeg': { ext: '.jpg', category: 'Image', icon: '🖼️' },
  'image/webp': { ext: '.webp', category: 'Image', icon: '🖼️' },
  'image/tiff': { ext: '.tiff', category: 'Image', icon: '🖼️' },
  
  // Code & Technical
  'text/javascript': { ext: '.js', category: 'Code', icon: '💻' },
  'text/typescript': { ext: '.ts', category: 'Code', icon: '💻' },
  'text/html': { ext: '.html', category: 'Code', icon: '💻' },
  'text/css': { ext: '.css', category: 'Code', icon: '💻' },
  'text/x-python': { ext: '.py', category: 'Code', icon: '💻' },
  'application/xml': { ext: '.xml', category: 'Code', icon: '💻' },
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_FILE_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES).map(type => type.ext).join(',');

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

interface FilePreview {
  file: File;
  preview?: string;
  category: string;
  icon: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled = false, className = '' }) => {
  const { theme } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    // Check file type
    const fileType = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES];
    if (!fileType) {
      return `File type not supported. Supported types: ${Object.values(SUPPORTED_FILE_TYPES).map(t => t.ext).join(', ')}`;
    }

    return null;
  };

  const processFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError('');
    const fileType = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES];
    
    const preview: FilePreview = {
      file,
      category: fileType.category,
      icon: fileType.icon
    };

    // For images, create preview URL
    if (file.type.startsWith('image/')) {
      preview.preview = URL.createObjectURL(file);
    }

    setSelectedFile(preview);
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]); // Only handle first file
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleUploadClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
          ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 
            theme === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}
        `}
      >
        {selectedFile ? (
          // File Preview
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">{selectedFile.icon}</span>
              <div className="text-left">
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedFile.file.name}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedFile.category} • {(selectedFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            
            {selectedFile.preview && (
              <div className="mt-4">
                <img
                  src={selectedFile.preview}
                  alt="Preview"
                  className="max-h-32 mx-auto rounded-lg border"
                />
              </div>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Remove File
            </button>
          </div>
        ) : (
          // Upload Prompt
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Upload a file
              </p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Drag and drop or click to browse
              </p>
            </div>
            
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <p>Supported: PDF, DOC, TXT, Images, Spreadsheets, Code files</p>
              <p>Maximum size: 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 