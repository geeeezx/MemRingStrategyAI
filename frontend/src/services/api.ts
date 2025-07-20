import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const searchRabbitHole = async (params: {
    query: string;
    userId: number;
    memoId: number;
    nodeId: string;
    previousConversation?: Array<{ user?: string; assistant?: string }>;
    concept?: string;
    followUpMode?: "expansive" | "focused";
}, signal?: AbortSignal) => {
    const response = await api.post('/rabbitholes/search', params, { signal });
    return response.data;
};

export const getUserMemos = async (userId: number) => {
    const response = await api.get(`/rabbitholes/memos/${userId}`);
    return response.data;
};

export const getConversationTree = async (memoId: number, userId: number) => {
    const response = await api.get(`/rabbitholes/tree/${memoId}/${userId}`);
    return response.data;
};

export const createMemo = async (params: {
    query: string;
    userId: number;
    provider?: string;
}, signal?: AbortSignal) => {
    const response = await api.post('/rabbitholes/create-memo', params, { signal });
    return response.data;
};

export const summarizeMemo = async (params: {
    memoId: number;
    userId: number;
    provider?: string;
}, signal?: AbortSignal) => {
    const response = await api.post('/rabbitholes/summarize-memo', params, { signal });
    return response.data;
};

export const generatePodcast = async (params: {
    memoId: number;
    userId: number;
    provider?: string;
    config?: {
        podcastName?: string;
        podcastTagline?: string;
        language?: string;
        hostName?: string;
        hostRole?: string;
        guestName?: string;
        guestRole?: string;
        conversationStyle?: string;
        wordCount?: number;
        creativity?: number;
        maxTokens?: number;
        hostVoice?: string;
        guestVoice?: string;
        additionalInstructions?: string;
    };
}, signal?: AbortSignal) => {
    const response = await api.post('/rabbitholes/generate-podcast', params, { signal });
    return response.data;
};

export const getPodcastVoices = async () => {
    const response = await api.get('/rabbitholes/podcast-voices');
    return response.data;
};

// File upload API (placeholder for when backend is ready)
export const uploadFileAndAnalyze = async (params: {
    file: File;
    userId: number;
    provider?: string;
}, signal?: AbortSignal) => {
    // TODO: Implement when backend file upload API is ready
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('userId', params.userId.toString());
    if (params.provider) {
        formData.append('provider', params.provider);
    }

    const response = await api.post('/rabbitholes/upload-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        signal
    });
    return response.data;
};

export default api;