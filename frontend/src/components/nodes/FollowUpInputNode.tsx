import React, { useState, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useTheme } from '../../contexts/ThemeContext';
import { searchRabbitHole } from '../../services/api';
import '../../styles/flow.css';

interface FollowUpInputNodeData {
  parentNodeId: string;
  onSubmit?: (response: any) => void;
  onCancel?: () => void;
}

const FollowUpInputNode = ({ data, id }: NodeProps<FollowUpInputNodeData>) => {
  const { theme } = useTheme();
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYouTubeInput, setShowYouTubeInput] = useState(false);
  const [showGoogleDriveInput, setShowGoogleDriveInput] = useState(false);
  const [showGmailInput, setShowGmailInput] = useState(false);
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [gmailUrl, setGmailUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!followUpQuestion.trim() && uploadedFiles.length === 0 && !youtubeUrl.trim() && !googleDriveUrl.trim() && !gmailUrl.trim()) return;
    
    setIsLoading(true);
    try {
      // Prepare the query with file information
      let enhancedQuery = followUpQuestion.trim();
      
      if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(file => file.name).join(', ');
        enhancedQuery += (enhancedQuery ? '\n\n' : '') + `📎 Uploaded files: ${fileNames}`;
      }
      
      if (youtubeUrl.trim()) {
        enhancedQuery += (enhancedQuery ? '\n\n' : '') + `🎥 YouTube URL: ${youtubeUrl.trim()}`;
      }

      if (googleDriveUrl.trim()) {
        enhancedQuery += (enhancedQuery ? '\n\n' : '') + `📁 Google Drive: ${googleDriveUrl.trim()}`;
      }

      if (gmailUrl.trim()) {
        enhancedQuery += (enhancedQuery ? '\n\n' : '') + `📧 Gmail: ${gmailUrl.trim()}`;
      }

      const response = await searchRabbitHole({
        query: enhancedQuery,
        userId: 1, // Default user ID for now
        memoId: 1, // Default memo ID for now
        nodeId: id, // Use the current node ID as parent
        previousConversation: [],
        concept: '',
        followUpMode: 'expansive'
      });

      // Call the onSubmit callback if provided
      if (data.onSubmit) {
        data.onSubmit(response);
      }

      // Reset form after successful submission
      setFollowUpQuestion('');
      setUploadedFiles([]);
      setYoutubeUrl('');
      setGoogleDriveUrl('');
      setGmailUrl('');
      setShowYouTubeInput(false);
      setShowGoogleDriveInput(false);
      setShowGmailInput(false);
      
    } catch (error) {
      console.error('Failed to submit follow-up question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (data.onCancel) {
      data.onCancel();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const validTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ];
        return validTypes.includes(file.type);
      });
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
    setShowUploadMenu(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
    setShowUploadMenu(false);
  };

  const handleYouTubeSubmit = () => {
    setShowYouTubeInput(false);
    setShowUploadMenu(false);
  };

  const handleGoogleDriveSubmit = () => {
    setShowGoogleDriveInput(false);
    setShowUploadMenu(false);
  };

  const handleGmailSubmit = () => {
    setShowGmailInput(false);
    setShowUploadMenu(false);
  };

  // SVG Icons Components
  const PdfIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#DC2626"/>
      <path d="M14 2v6h6" fill="none" stroke="#DC2626" strokeWidth="2"/>
      <text x="12" y="18" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">PDF</text>
    </svg>
  );

  const WordIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#2563EB"/>
      <path d="M14 2v6h6" fill="none" stroke="#2563EB" strokeWidth="2"/>
      <text x="12" y="18" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">W</text>
    </svg>
  );

  const ExcelIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#16A34A"/>
      <path d="M14 2v6h6" fill="none" stroke="#16A34A" strokeWidth="2"/>
      <text x="12" y="18" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">X</text>
    </svg>
  );

  const FileIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#6B7280"/>
      <path d="M14 2v6h6" fill="none" stroke="#6B7280" strokeWidth="2"/>
    </svg>
  );

  const YouTubeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
    </svg>
  );

  const GoogleDriveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12.01 2L6.5 11h3.5l4.5-7.5z" fill="#0F9D58"/>
      <path d="M16.5 15H23l-3.5-6z" fill="#F4B400"/>
      <path d="M7.5 15l3.5 6 3.5-6z" fill="#4285F4"/>
      <circle cx="12" cy="12" r="2" fill="#34A853"/>
    </svg>
  );

  const GmailIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636C.732 21.002 0 20.27 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819l6.545 4.91 6.545-4.91h3.819c.904 0 1.636.732 1.636 1.636z" fill="#D14836"/>
      <path d="M0 5.457c0-.904.732-1.636 1.636-1.636h3.819L12 8.73l6.545-4.91h3.819c.904 0 1.636.732 1.636 1.636L12 13.09 0 5.457z" fill="#F4B400"/>
    </svg>
  );

  const AttachIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <PdfIcon />;
      case 'doc':
      case 'docx':
        return <WordIcon />;
      case 'xls':
      case 'xlsx':
        return <ExcelIcon />;
      default:
        return <FileIcon />;
    }
  };

  return (
    <div className={`group relative rounded-lg shadow-lg min-h-[200px] max-h-[400px] flex flex-col ${
      theme === 'dark' ? 'bg-[#1a1a1a] border border-gray-600' : 'bg-white border border-gray-300'
    }`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      
      <div className={`flex-1 p-6 flex flex-col ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        {/* Header */}
        <div className="mb-4">
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Ask a Follow-up Question
          </h3>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Type your question, upload files, or connect cloud services
          </p>
        </div>

        {/* Input Area with Plus Button */}
        <div className="flex-1 mb-4 relative">
          <div className="flex space-x-2 h-full">
            {/* Plus Button */}
            <div className="relative">
              <button
                onClick={() => setShowUploadMenu(!showUploadMenu)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  theme === 'dark'
                    ? 'bg-transparent border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white hover:border-gray-500'
                    : 'bg-transparent border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400'
                }`}
                title="Upload files or connect services"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              {/* Upload Menu */}
              {showUploadMenu && (
                <div className={`absolute top-10 left-0 z-10 w-52 rounded-lg shadow-xl border backdrop-blur-sm ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a]/95 border-gray-600' 
                    : 'bg-white/95 border-gray-200'
                }`}>
                  <div className="p-1">
                    <button
                      onClick={triggerFileUpload}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-3 ${
                        theme === 'dark' ? 'hover:bg-gray-700/70 text-gray-200' : 'hover:bg-gray-100/70 text-gray-700'
                      }`}
                    >
                      <AttachIcon />
                      <span>Upload a file</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowYouTubeInput(true);
                        setShowUploadMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-3 ${
                        theme === 'dark' ? 'hover:bg-gray-700/70 text-gray-200' : 'hover:bg-gray-100/70 text-gray-700'
                      }`}
                    >
                      <YouTubeIcon />
                      <span>Add from YouTube</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowGoogleDriveInput(true);
                        setShowUploadMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-3 ${
                        theme === 'dark' ? 'hover:bg-gray-700/70 text-gray-200' : 'hover:bg-gray-100/70 text-gray-700'
                      }`}
                    >
                      <GoogleDriveIcon />
                      <span>Add from Google Drive</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowGmailInput(true);
                        setShowUploadMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-3 ${
                        theme === 'dark' ? 'hover:bg-gray-700/70 text-gray-200' : 'hover:bg-gray-100/70 text-gray-700'
                      }`}
                    >
                      <GmailIcon />
                      <span>Add from Gmail</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Text Area */}
            <textarea
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your follow-up question..."
              className={`flex-1 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400'
                  : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
              }`}
              disabled={isLoading}
            />
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* YouTube URL Input */}
        {showYouTubeInput && (
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
              <button
                onClick={handleYouTubeSubmit}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowYouTubeInput(false);
                  setYoutubeUrl('');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Google Drive URL Input */}
        {showGoogleDriveInput && (
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="url"
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                placeholder="Paste Google Drive link here..."
                className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
              <button
                onClick={handleGoogleDriveSubmit}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowGoogleDriveInput(false);
                  setGoogleDriveUrl('');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Gmail URL Input */}
        {showGmailInput && (
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="url"
                value={gmailUrl}
                onChange={(e) => setGmailUrl(e.target.value)}
                placeholder="Paste Gmail link or email thread URL..."
                className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
              <button
                onClick={handleGmailSubmit}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowGmailInput(false);
                  setGmailUrl('');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-4">
            <h4 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Uploaded Files:
            </h4>
            <div className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded border ${
                    theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file.name)}
                    <span className={`text-sm truncate max-w-[150px] ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className={`text-sm hover:text-red-500 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Services Display */}
        {youtubeUrl && !showYouTubeInput && (
          <div className="mb-4">
            <div className={`flex items-center justify-between p-2 rounded border ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <YouTubeIcon />
                <span className={`text-sm truncate max-w-[150px] ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  YouTube Video
                </span>
              </div>
              <button
                onClick={() => setYoutubeUrl('')}
                className={`text-sm hover:text-red-500 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {googleDriveUrl && !showGoogleDriveInput && (
          <div className="mb-4">
            <div className={`flex items-center justify-between p-2 rounded border ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <GoogleDriveIcon />
                <span className={`text-sm truncate max-w-[150px] ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Google Drive
                </span>
              </div>
              <button
                onClick={() => setGoogleDriveUrl('')}
                className={`text-sm hover:text-red-500 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {gmailUrl && !showGmailInput && (
          <div className="mb-4">
            <div className={`flex items-center justify-between p-2 rounded border ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <GmailIcon />
                <span className={`text-sm truncate max-w-[150px] ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Gmail Thread
                </span>
              </div>
              <button
                onClick={() => setGmailUrl('')}
                className={`text-sm hover:text-red-500 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || (!followUpQuestion.trim() && uploadedFiles.length === 0 && !youtubeUrl.trim() && !googleDriveUrl.trim() && !gmailUrl.trim())}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading || (!followUpQuestion.trim() && uploadedFiles.length === 0 && !youtubeUrl.trim() && !googleDriveUrl.trim() && !gmailUrl.trim())
                ? 'bg-gray-400 cursor-not-allowed'
                : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Searching...' : 'Ask'}
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
};

export default FollowUpInputNode;