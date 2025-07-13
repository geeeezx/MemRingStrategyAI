import express from "express";
import { tavily } from "@tavily/core";
import { openAIService } from "../services/openaiService";
import { mockDataService } from "../services/mockDataService";
import OpenAI from "openai";

interface RabbitHoleSearchRequest {
    query: string;
    previousConversation?: Array<{
        user?: string;
        assistant?: string;
    }>;
    concept?: string;
    followUpMode?: "expansive" | "focused";
    provider?: string;
}

interface SearchResponse {
    response: string;
    followUpQuestions: string[];
    contextualQuery: string;
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

export function setupRabbitHoleRoutes(_runtime: any) {
    const router = express.Router();
    const isDevMode = process.env.MODE === 'DEV';
    
    // Initialize Tavily client only if not in dev mode
    let tavilyClient: any = null;
    if (!isDevMode) {
        tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
    } else {
        console.log('Running in development mode - Tavily client not initialized');
    }

    router.get("/rabbitholes/providers", async (req: express.Request, res: express.Response) => {
        try {
            const providers = {
                defaultProvider: openAIService.getDefaultProvider(),
                availableProviders: openAIService.getAvailableProviders(),
                providerConfigs: openAIService.getAvailableProviders().map(provider => ({
                    provider,
                    model: openAIService.getModelConfig(provider).model,
                    available: openAIService.isProviderAvailable(provider)
                }))
            };
            res.json(providers);
        } catch (error) {
            console.error("Error getting provider information:", error);
            res.status(500).json({
                error: "Failed to get provider information",
                details: (error as Error).message,
            });
        }
    });

    router.post("/rabbitholes/search", async (req: express.Request, res: express.Response) => {
        try {
            const {
                query,
                previousConversation,
                concept,
                followUpMode = "expansive",
                provider,
            } = req.body as RabbitHoleSearchRequest;

            // Use mock data if in dev mode
            let searchResults;
            if (mockDataService.isDevMode()) {
                console.log("Using mock data for Tavily search");
                searchResults = await mockDataService.mockTavilySearch(query);
            } else {
                searchResults = await tavilyClient.search(query, {
                    searchDepth: "basic",
                    includeImages: true,
                    maxResults: 3,
                });
            }

            const conversationContext = previousConversation
                ? previousConversation
                      .map(
                          (msg) =>
                              (msg.user ? `User: ${msg.user}\n` : "") +
                              (msg.assistant ? `Assistant: ${msg.assistant}\n` : "")
                      )
                      .join("\n")
                : "";

            const messages = [
                {
                    role: "system",
                    content: `You are an AI assistant that helps users explore topics in depth. Format your responses using markdown with headers (####).

Your goal is to provide comprehensive, accurate information while maintaining engagement.
Base your response on the search results provided, and structure it clearly with relevant sections.

After your main response, include a "Follow-up Questions:" section with 3 consice questions that would help users explore the topic further.
One of the questions should be a question that is related to the search results, and the other two should be either thought provoking questions or devil's advocate/conspiracy questions.
`,
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

            const completion = (await openAIService.createChatCompletion(messages, provider)) as OpenAI.Chat.ChatCompletion;
            const response = completion.choices?.[0]?.message?.content ?? "";

            console.log("Search results:", `${JSON.stringify(searchResults)}`);
            console.log("AI response:", response);
            // Extract follow-up questions more precisely by looking for the section
            const followUpSection = response.split("Follow-up Questions:")[1];
            const followUpQuestions = followUpSection
                ? followUpSection
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim())
                    .map((line) => line.replace(/^\d+\.\s+/, "").trim())
                    .filter((line) => line.includes("?"))
                    .slice(0, 3)
                : [];

            // Remove the Follow-up Questions section from the main response
            const mainResponse = response.split("Follow-up Questions:")[0].trim();

            const sources = searchResults.results.map((result: any) => ({
                title: result.title || "",
                url: result.url || "",
                uri: result.url || "",
                author: result.author || "",
                image: result.image || "",
            }));

            const images = searchResults.images
                .map((result: any) => ({
                    url: result.url,
                    thumbnail: result.url,
                    description: result.description || "",
                }));

            const searchResponse: SearchResponse = {
                response: mainResponse,
                followUpQuestions,
                contextualQuery: query,
                sources,
                images,
            };

            res.json(searchResponse);
        } catch (error) {
            console.error("Error in rabbithole search endpoint:", error);
            res.status(500).json({
                error: "Failed to process search request",
                details: (error as Error).message,
            });
        }
    });

    return router;
} 