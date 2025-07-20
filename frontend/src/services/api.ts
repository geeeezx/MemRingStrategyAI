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

export default api; 