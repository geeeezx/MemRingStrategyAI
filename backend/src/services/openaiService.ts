import OpenAI from "openai";
import dotenv from 'dotenv';

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
    private modelConfigs: ModelConfig;
    private defaultProvider: string;

    private constructor() {
        const googleApiKey = process.env.GOOGLE_AI_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;
        const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai';

        this.clients = new Map();
        this.modelConfigs = {};
        this.defaultProvider = defaultProvider;

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
        const selectedProvider = provider || this.defaultProvider;
        const client = this.getClient(selectedProvider);
        const config = this.modelConfigs[selectedProvider];
        const response = await client.chat.completions.create({
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            model: config.model,
            stream: false,
            ...options,
        });
        return response as OpenAI.Chat.ChatCompletion;
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