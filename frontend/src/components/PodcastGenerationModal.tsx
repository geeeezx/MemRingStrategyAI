import React, { useState, useEffect } from 'react';
import { generatePodcast, getPodcastVoices } from '../services/api';

interface PodcastGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    memoId: number;
    userId: number;
    memoTitle: string;
}

interface PodcastResponse {
    success: boolean;
    script: string;
    audioFileName: string;
    audioUrl: string;
    scriptFileName: string;
    scriptUrl: string;
    timestamp: number;
    summary: string;
    totalNodes: number;
    answeredNodes: number;
}

interface VoiceOptions {
    voices: string[];
    defaultVoices: {
        host: string;
        guest: string;
    };
}

const PodcastGenerationModal: React.FC<PodcastGenerationModalProps> = ({
    isOpen,
    onClose,
    memoId,
    userId,
    memoTitle
}) => {
    const [podcast, setPodcast] = useState<PodcastResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [voices, setVoices] = useState<VoiceOptions | null>(null);
    
    // Configuration state
    const [config, setConfig] = useState({
        provider: 'gemini',
        podcastName: '', // 留空表示使用默认的基于memo的名称
        podcastTagline: '', // 留空表示使用默认的基于memo的标语
        language: '中文',
        hostName: 'Alex',
        hostRole: '技术主持人',
        guestName: 'Dr. Chen',
        guestRole: 'AI研究专家',
        conversationStyle: 'professional, engaging, informative',
        wordCount: 800,
        creativity: 0.7,
        hostVoice: 'Kore',
        guestVoice: 'Puck',
        additionalInstructions: '请确保对话生动有趣，包含具体的例子和应用场景'
    });

    // Load voice options on mount
    useEffect(() => {
        if (isOpen) {
            loadVoiceOptions();
        }
    }, [isOpen]);

    const loadVoiceOptions = async () => {
        try {
            const voiceData = await getPodcastVoices();
            setVoices(voiceData);
            // Set default voices
            setConfig(prev => ({
                ...prev,
                hostVoice: voiceData.defaultVoices.host,
                guestVoice: voiceData.defaultVoices.guest
            }));
        } catch (err) {
            console.error('Failed to load voice options:', err);
        }
    };

    const handleGeneratePodcast = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // 构建请求参数 - 只有非空配置才会被发送
            const requestParams: any = {
                memoId,
                userId
            };

            // 只有当配置不为空时才添加可选参数
            if (config.provider !== 'gemini') {
                requestParams.provider = config.provider;
            }

            // 构建配置对象（只包含非默认值）
            const configObj: any = {};
            if (config.podcastName) configObj.podcastName = config.podcastName;
            if (config.podcastTagline) configObj.podcastTagline = config.podcastTagline;
            if (config.language !== '中文') configObj.language = config.language;
            if (config.hostName !== 'Alex') configObj.hostName = config.hostName;
            if (config.hostRole !== '技术主持人') configObj.hostRole = config.hostRole;
            if (config.guestName !== 'Dr. Chen') configObj.guestName = config.guestName;
            if (config.guestRole !== 'AI研究专家') configObj.guestRole = config.guestRole;
            if (config.conversationStyle !== 'professional, engaging, informative') configObj.conversationStyle = config.conversationStyle;
            if (config.wordCount !== 800) configObj.wordCount = config.wordCount;
            if (config.creativity !== 0.7) configObj.creativity = config.creativity;
            if (config.hostVoice !== 'Kore') configObj.hostVoice = config.hostVoice;
            if (config.guestVoice !== 'Puck') configObj.guestVoice = config.guestVoice;
            if (config.additionalInstructions) configObj.additionalInstructions = config.additionalInstructions;

            // 只有当有自定义配置时才添加config
            if (Object.keys(configObj).length > 0) {
                requestParams.config = configObj;
            }

            const result = await generatePodcast(requestParams);
            
            setPodcast(result);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate podcast');
            console.error('Podcast generation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPodcast(null);
        setError(null);
        onClose();
    };

    const downloadFile = (url: string, filename: string) => {
        const fullUrl = `${process.env.REACT_APP_API_URL}${url}`;
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        🎙️ 播客生成: {memoTitle}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {!podcast && (
                    <div className="space-y-4">
                        {/* Auto-generated Info Section */}
                        <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-blue-700 mb-2">📝 基于Memo自动生成</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600">播客名称:</span>
                                    <div className="font-medium text-gray-800 mt-1">深度解析：{memoTitle}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600">播客标语:</span>
                                    <div className="font-medium text-gray-800 mt-1">
                                        {/* This will be generated automatically based on memo content */}
                                        基于当前话题的深度探讨
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Configuration Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    AI Provider
                                </label>
                                <select
                                    value={config.provider}
                                    onChange={(e) => setConfig(prev => ({ ...prev, provider: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    disabled={loading}
                                >
                                    <option value="gemini">Gemini</option>
                                    <option value="openai">OpenAI</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    自定义播客名称 (可选)
                                </label>
                                <input
                                    type="text"
                                    value={config.podcastName}
                                    onChange={(e) => setConfig(prev => ({ ...prev, podcastName: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    disabled={loading}
                                    placeholder={`默认: 深度解析：${memoTitle}`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    主持人姓名
                                </label>
                                <input
                                    type="text"
                                    value={config.hostName}
                                    onChange={(e) => setConfig(prev => ({ ...prev, hostName: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    嘉宾姓名
                                </label>
                                <input
                                    type="text"
                                    value={config.guestName}
                                    onChange={(e) => setConfig(prev => ({ ...prev, guestName: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    disabled={loading}
                                />
                            </div>

                            {voices && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            主持人声音
                                        </label>
                                        <select
                                            value={config.hostVoice}
                                            onChange={(e) => setConfig(prev => ({ ...prev, hostVoice: e.target.value }))}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                            disabled={loading}
                                        >
                                            {voices.voices.map(voice => (
                                                <option key={voice} value={voice}>{voice}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            嘉宾声音
                                        </label>
                                        <select
                                            value={config.guestVoice}
                                            onChange={(e) => setConfig(prev => ({ ...prev, guestVoice: e.target.value }))}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                            disabled={loading}
                                        >
                                            {voices.voices.map(voice => (
                                                <option key={voice} value={voice}>{voice}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    字数目标
                                </label>
                                <input
                                    type="number"
                                    value={config.wordCount}
                                    onChange={(e) => setConfig(prev => ({ ...prev, wordCount: parseInt(e.target.value) }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    disabled={loading}
                                    min="400"
                                    max="2000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    创意程度 ({config.creativity})
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={config.creativity}
                                    onChange={(e) => setConfig(prev => ({ ...prev, creativity: parseFloat(e.target.value) }))}
                                    className="w-full"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                对话风格
                            </label>
                            <input
                                type="text"
                                value={config.conversationStyle}
                                onChange={(e) => setConfig(prev => ({ ...prev, conversationStyle: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                disabled={loading}
                                placeholder="professional, engaging, informative"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                特殊要求
                            </label>
                            <textarea
                                value={config.additionalInstructions}
                                onChange={(e) => setConfig(prev => ({ ...prev, additionalInstructions: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                disabled={loading}
                                rows={3}
                                placeholder="请确保对话生动有趣，包含具体的例子和应用场景"
                            />
                        </div>

                        {/* Generate Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={handleGeneratePodcast}
                                disabled={loading}
                                className={`px-6 py-3 rounded-lg font-medium text-white ${
                                    loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                {loading ? '生成中...' : '🎙️ 生成播客'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <strong>错误:</strong> {error}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-600">正在生成播客内容...</span>
                    </div>
                )}

                {/* Podcast Result */}
                {podcast && (
                    <div className="flex-1 overflow-hidden">
                        {/* Statistics */}
                        <div className="bg-green-100 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-green-700 mb-2">✅ 播客生成成功!</h3>
                            <div className="grid grid-cols-3 gap-4 text-sm text-green-600">
                                <div>
                                    <span>总节点:</span>
                                    <span className="ml-2 font-medium">{podcast.totalNodes}</span>
                                </div>
                                <div>
                                    <span>已回答节点:</span>
                                    <span className="ml-2 font-medium">{podcast.answeredNodes}</span>
                                </div>
                                <div>
                                    <span>时间戳:</span>
                                    <span className="ml-2 font-medium">{new Date(podcast.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Download Section */}
                        <div className="bg-blue-100 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-blue-700 mb-3">📥 下载文件</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => downloadFile(podcast.audioUrl, podcast.audioFileName)}
                                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                                >
                                    🎵 下载音频文件
                                </button>
                                <button
                                    onClick={() => downloadFile(podcast.scriptUrl, podcast.scriptFileName)}
                                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                                >
                                    📄 下载脚本文件
                                </button>
                            </div>
                        </div>

                        {/* Script Preview */}
                        <div className="flex-1 overflow-auto">
                            <h3 className="font-semibold text-gray-700 mb-3">📝 生成的播客脚本</h3>
                            <div className="bg-gray-100 rounded-lg p-4 overflow-auto max-h-60">
                                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                                    {podcast.script}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PodcastGenerationModal; 