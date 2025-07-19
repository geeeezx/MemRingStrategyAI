import React, { useState } from 'react';
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

  const handleSubmit = async () => {
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

  return (
    <div className={`group relative rounded-lg shadow-lg min-h-[200px] max-h-[250px] flex flex-col ${
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
            Type your question below and press Enter or click Ask
          </p>
        </div>

        {/* Input Area */}
        <div className="flex-1 mb-4">
          <textarea
            value={followUpQuestion}
            onChange={(e) => setFollowUpQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your follow-up question..."
            className={`w-full h-full p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
            }`}
            disabled={isLoading}
          />
        </div>

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
            disabled={isLoading || !followUpQuestion.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading || !followUpQuestion.trim()
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