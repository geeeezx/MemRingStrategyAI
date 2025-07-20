import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useTheme } from '../../contexts/ThemeContext';
import { searchRabbitHole, uploadFileAndAnalyze } from '../../services/api';
import FileUpload from '../FileUpload';
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
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleTextSubmit = async () => {
    if (!followUpQuestion.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await searchRabbitHole({
        query: followUpQuestion.trim(),
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
      
    } catch (error) {
      console.error('Failed to submit follow-up question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSubmit = async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    
    try {
      let response;
      
      try {
        // Try to call the real API first (for file upload follow-ups)
        response = await uploadFileAndAnalyze({
          file: file,
          userId: 1,
          provider: 'gemini'
        });
        console.log('Follow-up file upload API response:', response);
      } catch (apiError) {
        console.log('Backend file upload API not available yet, using mock response');
        
        // Fallback to mock response when backend API is not ready
        response = {
          memoId: Date.now(),
          rootNodeId: `followup-file-${Date.now()}`,
          title: `Follow-up Analysis of ${file.name}`,
          answer: `Follow-up file uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Analysis will be available once the backend file processing API is implemented.`,
          followUpQuestions: [
            "How does this relate to our previous discussion?",
            "What additional insights does this provide?",
            "What patterns emerge when combined with earlier information?"
          ],
          newFollowUpNodeIds: [],
          sources: [],
          images: []
        };
      }

      // Call the onSubmit callback if provided
      if (data.onSubmit) {
        data.onSubmit(response);
      }
      
    } catch (error) {
      console.error('Failed to submit follow-up file:', error);
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
      handleTextSubmit();
    }
  };

  const isSubmitDisabled = activeTab === 'text' 
    ? (!followUpQuestion.trim() || isLoading)
    : (!selectedFile || isLoading);

  return (
    <div className={`group relative rounded-xl shadow-xl min-h-[320px] max-w-[420px] flex flex-col backdrop-blur-sm ${
      theme === 'dark' 
        ? 'bg-[#1a1a1a]/95 border border-gray-600/50' 
        : 'bg-white/95 border border-gray-200/50'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />
      
      <div className={`flex-1 p-6 flex flex-col`}>
        {/* Header with improved styling */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Ask a Follow-up Question
            </h3>
          </div>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Continue the conversation with text or upload a related file
          </p>
        </div>

        {/* Tab Switcher - Compact design */}
        <div className="flex justify-center mb-5">
          <div className={`flex rounded-lg p-1 ${
            theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100/80'
          }`}>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'text'
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'bg-white text-gray-900 shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Text</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'file'
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'bg-white text-gray-900 shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>File</span>
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 mb-5">
          {activeTab === 'text' ? (
            <div className="h-full">
              <textarea
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your follow-up question..."
                className={`w-full h-32 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:bg-white'
                }`}
                disabled={isLoading}
              />
            </div>
          ) : (
                         <div className="h-full">
               <FileUpload
                 onFileSelect={handleFileSubmit}
                 disabled={isLoading}
                 className="h-32"
                 compact={true}
               />
             </div>
          )}
        </div>

        {/* Action Buttons with improved styling */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'text' ? handleTextSubmit : undefined}
            disabled={isSubmitDisabled}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
              isSubmitDisabled
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{activeTab === 'text' ? 'Searching...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Ask</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Overlay for File Tab */}
        {isLoading && activeTab === 'file' && (
          <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
            <div className={`${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            } px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3`}>
              <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Processing file...
              </span>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
};

export default FollowUpInputNode; 