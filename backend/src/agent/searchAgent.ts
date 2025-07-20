import { openAIService } from "../services/openaiService";
import { searchService, SearchResult, SearchOptions } from "../services/searchService";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

interface SearchAgentRequest {
    query: string;
    concept?: string;
    followUpMode?: "expansive" | "focused";
    conversationPath: Array<{ user: string; assistant: string }>;
    provider?: string;
    searchOptions?: SearchOptions;
}

interface SearchAgentResponse {
    mainResponse: string;
    followUpQuestions: string[];
    imageUrls: string[];
    sources: Array<{
        title: string;
        url: string;
        uri: string;
        author: string;
        image: string;
    }>;
    images: Array<{
        url: string;
        thumbnail: string;
        description: string;
    }>;
}

export class SearchAgent {
    private static readPromptFile(filename: string): string {
        try {
            const promptPath = path.join(__dirname, '../prompt', filename);
            return fs.readFileSync(promptPath, 'utf-8');
        } catch (error) {
            console.error(`Error reading prompt file ${filename}:`, error);
            // Fallback to default prompt if file reading fails
            return `You are an AI assistant that helps users explore topics in depth. Format your responses using markdown with headers (####).

Your goal is to provide comprehensive, accurate information while maintaining engagement.
Base your response on the search results provided, and structure it clearly with relevant sections.

After your main response, include a "Follow-up Questions:" section with 3 concise questions that would help users explore the topic further.
One of the questions should be a question that is related to the search results, and the other two should be either thought provoking questions or devil's advocate/conspiracy questions.`;
        }
    }

    static async processSearchResults(request: SearchAgentRequest): Promise<SearchAgentResponse> {
        const {
            query,
            concept,
            followUpMode = "expansive",
            conversationPath,
            provider = "gemini",
            searchOptions = {
                searchDepth: "basic",
                includeImages: true,
                maxResults: 3,
            }
        } = request;

        // Perform search using searchService
        const searchResults = await searchService.search(query, searchOptions);

        // Build conversation context
        const conversationContext = conversationPath
            .map(msg => `User: ${msg.user}\nAssistant: ${msg.assistant}\n`)
            .join("\n");

        // Prepare messages for LLM
        const messages = [
            {
                role: "system",
                content: this.readPromptFile('search-system-prompt.md'),
            },
            {
                role: "user",
                content: `Previous conversation:\n${conversationContext}\n\nSearch results about "${query}":\n${JSON.stringify(
                    searchResults
                )}\n\nPlease provide a comprehensive response about ${
                    concept || query
                }. Include relevant facts, context, and relationships to other topics. Format the response in markdown with #### headers. The response should be ${
                    followUpMode === "expansive" ? "broad and exploratory" : "focused and specific"
                }.`,
            },
        ];

        // Call LLM service
        const completion = (await openAIService.createChatCompletion(messages, provider)) as OpenAI.Chat.ChatCompletion;
        const response = completion.choices?.[0]?.message?.content ?? "";

        // Extract follow-up questions more precisely by looking for the section
        const followUpSection = response.split("Follow-up Questions:")[1];
        const followUpQuestions = followUpSection
            ? followUpSection
                .trim()
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => line.replace(/^\d+\.\s*/, "").trim())
                .filter((line) => line.includes("?"))
                .slice(0, 3)
            : [];

        // Remove the Follow-up Questions section from the main response
        const mainResponse = response.split("Follow-up Questions:")[0].trim();

        // Extract image URLs from search results
        const imageUrls = searchResults.images
            ? searchResults.images.map((img: any) => img.url).filter((url: string) => url)
            : [];

        // Generate sources from search results
        const sources = searchResults.results.map((result: any) => ({
            title: result.title || "",
            url: result.url || "",
            uri: result.url || "",
            author: result.author || "",
            image: result.image || "",
        }));

        // Generate images from search results
        const images = searchResults.images.map((result: any) => ({
            url: result.url,
            thumbnail: result.url,
            description: result.description || "",
        }));

        return {
            mainResponse,
            followUpQuestions,
            imageUrls,
            sources,
            images
        };
    }

    static async processAddNodeRequest(request: {
        question: string;
        conversationPath: Array<{ user: string; assistant: string }>;
        provider?: string;
        searchOptions?: SearchOptions;
    }): Promise<{ 
        answer: string; 
        followUpQuestions: string[];
        imageUrls: string[];
        sources: Array<{
            title: string;
            url: string;
            uri: string;
            author: string;
            image: string;
        }>;
        images: Array<{
            url: string;
            thumbnail: string;
            description: string;
        }>;
    }> {
        const {
            question,
            conversationPath,
            provider = "gemini",
            searchOptions = {
                searchDepth: "basic",
                includeImages: true,
                maxResults: 3,
            }
        } = request;

        // Perform search using searchService
        const searchResults = await searchService.search(question, searchOptions);

        // Build conversation context
        const conversationContext = conversationPath
            .map(msg => `User: ${msg.user}\nAssistant: ${msg.assistant}\n`)
            .join("\n");

        // Prepare messages for LLM - using same prompt as search functionality
        const messages = [
            {
                role: "system",
                content: this.readPromptFile('search-system-prompt.md'),
            },
            {
                role: "user",
                content: `Previous conversation:\n${conversationContext}\n\nSearch results about "${question}":\n${JSON.stringify(
                    searchResults
                )}\n\nPlease provide a comprehensive response about ${question}. Include relevant facts, context, and relationships to other topics. Format the response in markdown with #### headers. The response should be broad and exploratory.`,
            },
        ];

        // Call LLM service
        const completion = (await openAIService.createChatCompletion(messages, provider)) as OpenAI.Chat.ChatCompletion;
        const response = completion.choices?.[0]?.message?.content ?? "";

        // Extract follow-up questions more precisely by looking for the section
        const followUpSection = response.split("Follow-up Questions:")[1];
        const followUpQuestions = followUpSection
            ? followUpSection
                .trim()
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => line.replace(/^\d+\.\s*/, "").trim())
                .filter((line) => line.includes("?"))
                .slice(0, 3)
            : [];

        // Remove the Follow-up Questions section from the main response
        const answer = response.split("Follow-up Questions:")[0].trim();

        // Extract image URLs from search results
        const imageUrls = searchResults.images
            ? searchResults.images.map((img: any) => img.url).filter((url: string) => url)
            : [];

        // Generate sources from search results
        const sources = searchResults.results.map((result: any) => ({
            title: result.title || "",
            url: result.url || "",
            uri: result.url || "",
            author: result.author || "",
            image: result.image || "",
        }));

        // Generate images from search results
        const images = searchResults.images.map((result: any) => ({
            url: result.url,
            thumbnail: result.url,
            description: result.description || "",
        }));

        return {
            answer,
            followUpQuestions,
            imageUrls,
            sources,
            images
        };
    }
} 