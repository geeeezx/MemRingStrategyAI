import React, { useState } from 'react';
import { summarizeMemo } from '../services/api';

interface MemoSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    memoId: number;
    userId: number;
    memoTitle: string;
}

interface SummaryResponse {
    summary: string;
    totalNodes: number;
    answeredNodes: number;
}

const MemoSummaryModal: React.FC<MemoSummaryModalProps> = ({
    isOpen,
    onClose,
    memoId,
    userId,
    memoTitle
}) => {
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<string>('gemini');

    const handleSummarize = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await summarizeMemo({
                memoId,
                userId,
                provider
            });
            
            setSummary(result);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate summary');
            console.error('Summarization error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSummary(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Memo Summary: {memoTitle}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="provider" className="text-sm font-medium text-gray-700">
                            AI Provider:
                        </label>
                        <select
                            id="provider"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-1 text-sm"
                            disabled={loading}
                        >
                            <option value="gemini">Gemini</option>
                            <option value="openai">OpenAI</option>
                        </select>
                    </div>
                    
                    <button
                        onClick={handleSummarize}
                        disabled={loading}
                        className={`px-4 py-2 rounded font-medium ${
                            loading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                        {loading ? 'Generating Summary...' : 'Generate Summary'}
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-600">Analyzing conversation tree...</span>
                    </div>
                )}

                {/* Summary Display */}
                {summary && (
                    <div className="flex-1 overflow-hidden">
                        {/* Statistics */}
                        <div className="bg-gray-100 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Summary Statistics</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Total Nodes:</span>
                                    <span className="ml-2 font-medium">{summary.totalNodes}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Answered Nodes:</span>
                                    <span className="ml-2 font-medium">{summary.answeredNodes}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Content */}
                        <div className="flex-1 overflow-auto">
                            <h3 className="font-semibold text-gray-700 mb-3">Generated Summary</h3>
                            <div className="prose prose-sm max-w-none">
                                <div 
                                    className="whitespace-pre-wrap text-gray-800 leading-relaxed"
                                    dangerouslySetInnerHTML={{ 
                                        __html: summary.summary.replace(/\n/g, '<br>') 
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Initial State */}
                {!loading && !summary && !error && (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <p className="text-lg mb-2">Ready to generate summary</p>
                            <p className="text-sm">
                                Click "Generate Summary" to analyze this memo's conversation tree
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoSummaryModal; 