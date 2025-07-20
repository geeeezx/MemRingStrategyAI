import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import { mockDataService } from './mockDataService';

dotenv.config();

export interface OpenAIConfig {
    baseURL: string;
    apiKey: string;
    defaultModel: string;
}

export interface ModelConfig {
    [key: string]: {
        baseURL: string;
        apiKey: string;
        model: string;
    };
}

export class OpenAIService {
    private static instance: OpenAIService;
    private clients: Map<string, OpenAI>;
    private geminiClients: Map<string, GoogleGenAI>;
    private modelConfigs: ModelConfig;
    private defaultProvider: string;

    private constructor() {
        const googleApiKey = process.env.GOOGLE_AI_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;
        const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai';
        // 统一开发模式检查逻辑，与mockDataService保持一致
        const isDevMode = process.env.MODE !== 'production';

        this.clients = new Map();
        this.geminiClients = new Map();
        this.modelConfigs = {};
        this.defaultProvider = defaultProvider;

        // In dev mode, create mock configurations to avoid API key requirements
        if (isDevMode) {
            console.log('Running in development mode - using mock AI configurations');
            this.modelConfigs.openai = {
                baseURL: "https://api.openai.com/v1",
                apiKey: "mock-openai-key",
                model: "gpt-4o",
            };
            this.modelConfigs.gemini = {
                baseURL: "https://generativelanguage.googleapis.com/v1beta",
                apiKey: "mock-gemini-key",
                model: "gemini-2.0-flash",
            };
            this.defaultProvider = 'gemini'; // Default to gemini in dev mode
            return;
        }

        // Configure OpenAI if API key is provided
        if (openaiApiKey) {
            this.modelConfigs.openai = {
                baseURL: "https://api.openai.com/v1",
                apiKey: openaiApiKey,
                model: process.env.OPENAI_MODEL || "gpt-4o",
            };
        }

        // Configure Google AI if API key is provided
        if (googleApiKey) {
            this.modelConfigs.gemini = {
                baseURL: "https://generativelanguage.googleapis.com/v1beta",
                apiKey: googleApiKey,
                model: process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash",
            };
        }

        // Ensure at least one provider is configured
        if (Object.keys(this.modelConfigs).length === 0) {
            throw new Error('No AI provider configured. Please set OPENAI_API_KEY or GOOGLE_AI_API_KEY in environment variables');
        }

        // Validate default provider is available
        if (!this.modelConfigs[this.defaultProvider]) {
            const availableProviders = Object.keys(this.modelConfigs);
            console.warn(`Default provider '${this.defaultProvider}' not configured. Using '${availableProviders[0]}' instead.`);
            this.defaultProvider = availableProviders[0];
        }
    }

    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    private getClient(provider: string): OpenAI {
        if (!this.clients.has(provider)) {
            const config = this.modelConfigs[provider];
            if (!config) {
                throw new Error(`Provider ${provider} not configured`);
            }
            this.clients.set(
                provider,
                new OpenAI({
                    baseURL: config.baseURL,
                    apiKey: config.apiKey,
                })
            );
        }
        return this.clients.get(provider)!;
    }

    public async createChatCompletion(
        messages: Array<{
            role: string;
            content: string | Array<{ type: string; text?: string; imageUrl?: string }>;
        }>,
        provider?: string,
        options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {}
    ) {
        // Use mock data if in dev mode
        if (mockDataService.isDevMode()) {
            console.log("Using mock data for OpenAI completion");
            return await mockDataService.mockOpenAICompletion(
                messages as Array<{ role: string; content: string; }>,
                provider || this.defaultProvider
            );
        }

        const selectedProvider = provider || this.defaultProvider;
        const config = this.modelConfigs[selectedProvider];

        // Handle Gemini API calls
        if (selectedProvider === 'gemini') {
            return await this.callGeminiAPI(messages, config, options);
        }

        // Handle OpenAI API calls
        const client = this.getClient(selectedProvider);
        const response = await client.chat.completions.create({
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            model: config.model,
            stream: false,
            ...options,
        });
        return response as OpenAI.Chat.ChatCompletion;
    }

    private async callGeminiAPI(
        messages: Array<{
            role: string;
            content: string | Array<{ type: string; text?: string; imageUrl?: string }>;
        }>,
        config: any,
        options: any
    ): Promise<OpenAI.Chat.ChatCompletion> {
        console.log('Calling Gemini API...');
        
        // Check API key
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('Google API key not configured. Please set GOOGLE_AI_API_KEY environment variable.');
        }

        const ai = new GoogleGenAI({ apiKey });

        // Convert messages to Gemini format
        const geminiMessages = messages.map(msg => {
            if (msg.role === 'system') {
                return `System: ${msg.content}`;
            } else if (msg.role === 'user') {
                return `User: ${msg.content}`;
            } else {
                return `Assistant: ${msg.content}`;
            }
        });

        const prompt = geminiMessages.join('\n\n');
        console.log('Gemini prompt:', prompt.substring(0, 200) + '...');

        try {
            const result = await ai.models.generateContent({
                model: config.model,
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.max_tokens || 2048,
                }
            });

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (!text) {
                console.error('No text content in Gemini response:', JSON.stringify(result, null, 2));
                throw new Error('No text content received from Gemini API');
            }

            // Convert to OpenAI format for compatibility
            return {
                id: `gemini-completion-${Date.now()}`,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: config.model,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: "assistant",
                            content: text
                        },
                        finish_reason: "stop"
                    }
                ],
                usage: {
                    prompt_tokens: 0, // Gemini doesn't provide token counts
                    completion_tokens: 0,
                    total_tokens: 0
                }
            } as OpenAI.Chat.ChatCompletion;
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error(`Gemini API call failed: ${error}`);
        }
    }

    public async createStreamCompletion(
        messages: Array<{
            role: string;
            content: string | Array<{ type: string; text?: string; imageUrl?: string }>;
        }>,
        provider?: string,
        options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {},
        signal?: AbortSignal
    ) {
        const selectedProvider = provider || this.defaultProvider;
        const client = this.getClient(selectedProvider);
        const config = this.modelConfigs[selectedProvider];
        const stream = await client.chat.completions.create(
            {
                messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
                model: config.model,
                stream: true,
                ...options,
            },
            { signal }
        );
        return stream;
    }

    public getModelConfig(provider?: string) {
        const selectedProvider = provider || this.defaultProvider;
        return this.modelConfigs[selectedProvider];
    }

    public getDefaultProvider(): string {
        return this.defaultProvider;
    }

    public getAvailableProviders(): string[] {
        return Object.keys(this.modelConfigs);
    }

    public isProviderAvailable(provider: string): boolean {
        return provider in this.modelConfigs;
    }
}

export const openAIService = OpenAIService.getInstance(); 