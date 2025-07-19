import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface MockTavilyResult {
    results: Array<{
        title: string;
        url: string;
        author: string;
        image: string;
        content: string;
    }>;
    images: Array<{
        url: string;
        thumbnail: string;
        description: string;
    }>;
}

export class MockDataService {
    private static instance: MockDataService;
    private searchResponses: { [key: string]: MockTavilyResult } = {};
    private aiResponses: { [key: string]: string } = {};

    private constructor() {
        this.initializeMockData();
    }

    public static getInstance(): MockDataService {
        if (!MockDataService.instance) {
            MockDataService.instance = new MockDataService();
        }
        return MockDataService.instance;
    }

    private initializeMockData() {
        // Mock search results for common topics
        this.searchResponses = {
            default: {
                results: [
                    {
                        title: "Understanding the Topic - Wikipedia",
                        url: "https://en.wikipedia.org/wiki/example",
                        author: "Wikipedia Contributors",
                        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Wikipedia-logo-v2-en.svg/1200px-Wikipedia-logo-v2-en.svg.png",
                        content: "A comprehensive overview of the topic with detailed explanations and historical context."
                    },
                    {
                        title: "Latest Research and Developments",
                        url: "https://example.com/research",
                        author: "Research Institute",
                        image: "https://via.placeholder.com/300x200?text=Research",
                        content: "Recent findings and developments in the field with scientific backing."
                    },
                    {
                        title: "Practical Applications and Examples",
                        url: "https://example.com/applications",
                        author: "Expert Analysis",
                        image: "https://via.placeholder.com/300x200?text=Applications",
                        content: "Real-world applications and case studies demonstrating practical use."
                    }
                ],
                images: [
                    {
                        url: "https://via.placeholder.com/600x400?text=Mock+Image+1",
                        thumbnail: "https://via.placeholder.com/150x100?text=Mock+Image+1",
                        description: "A relevant illustration of the topic"
                    },
                    {
                        url: "https://via.placeholder.com/600x400?text=Mock+Image+2",
                        thumbnail: "https://via.placeholder.com/150x100?text=Mock+Image+2",
                        description: "Another perspective on the subject"
                    }
                ]
            }
        };

        // Mock AI responses for common patterns
        this.aiResponses = {
            default: `#### Overview
This is a comprehensive exploration of your topic, providing detailed insights and analysis based on the available information.

#### Key Concepts
The main concepts surrounding this topic include several fundamental principles that are essential to understanding the broader context.

#### Historical Context
The development of this field has been shaped by various historical events and discoveries that have led to our current understanding.

#### Recent Developments
Recent research has revealed new insights and applications that are expanding our knowledge in this area.

#### Practical Applications
These concepts have practical applications in various fields, including technology, science, and everyday life.

#### Future Implications
The future of this field holds promise for continued innovation and discovery.

Follow-up Questions:
1. What are the most significant recent developments in this field?
2. How might this topic evolve in the next decade?
3. What are some potential controversial aspects or alternative viewpoints?`
        };
    }

    public async mockTavilySearch(query: string): Promise<MockTavilyResult> {
        // Simulate API delay
        await delay(500 + Math.random() * 1000);

        // Generate topic-specific mock data
        const baseResult = this.searchResponses.default;
        
        // Customize the mock data based on the query
        const customResult: MockTavilyResult = {
            results: baseResult.results.map(result => ({
                ...result,
                title: result.title.replace("the Topic", query),
                content: result.content.replace("the topic", query.toLowerCase())
            })),
            images: baseResult.images.map(image => ({
                ...image,
                description: image.description.replace("the topic", query.toLowerCase())
            }))
        };

        return customResult;
    }

    public async mockOpenAICompletion(
        messages: Array<{
            role: string;
            content: string;
        }>,
        provider: string = "gemini"
    ): Promise<OpenAI.Chat.ChatCompletion> {
        // Simulate API delay
        await delay(1000 + Math.random() * 2000);

        // Extract the main topic from the messages
        const userMessage = messages.find(msg => msg.role === "user")?.content || "";
        const topicMatch = userMessage.match(/about "(.*?)"/);
        const topic = topicMatch ? topicMatch[1] : "this topic";

        // Generate a response based on the topic
        const response = this.aiResponses.default
            .replace(/this topic/g, topic)
            .replace(/This topic/g, topic.charAt(0).toUpperCase() + topic.slice(1))
            .replace(/your topic/g, topic);

        return {
            id: `mock-completion-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o",
            choices: [
                {
                    index: 0,
                    message: {
                        role: "assistant",
                        content: response
                    },
                    finish_reason: "stop"
                }
            ],
            usage: {
                prompt_tokens: 100,
                completion_tokens: 250,
                total_tokens: 350
            }
        } as OpenAI.Chat.ChatCompletion;
    }

    public isDevMode(): boolean {
        return process.env.MODE === "DEV";
    }
}

export const mockDataService = MockDataService.getInstance(); 