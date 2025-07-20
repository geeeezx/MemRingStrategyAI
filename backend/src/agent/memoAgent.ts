import { openAIService } from "../services/openaiService";
import { searchService, SearchOptions } from "../services/searchService";
import { dbService } from "../services/dbService";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

interface CreateMemoRequest {
    query: string;
    userId: number;
    provider?: string;
    searchOptions?: SearchOptions;
}

interface CreateMemoResponse {
    memoId: number;
    title: string;
    tags: string[];
    rootNodeId: string;
    answer: string;
    followUpQuestions: string[];
    newFollowUpNodeIds: string[];
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

interface IntentAnalysisResult {
    title: string;
    tags: string[];
}

export class MemoAgent {
    private static readPromptFile(filename: string): string {
        try {
            const promptPath = path.join(__dirname, '../prompt', filename);
            return fs.readFileSync(promptPath, 'utf-8');
        } catch (error) {
            console.error(`Error reading prompt file ${filename}:`, error);
            // Fallback to default prompt if file reading fails
            return `You are an AI assistant that helps users explore topics in depth.`;
        }
    }

    private static async analyzeIntent(query: string, provider: string = "gemini"): Promise<IntentAnalysisResult> {
        const messages = [
            {
                role: "system",
                content: this.readPromptFile('intent-analysis-prompt.md'),
            },
            {
                role: "user",
                content: `Analyze this user query and generate appropriate title and tags: "${query}"`,
            },
        ];

        const completion = (await openAIService.createChatCompletion(messages, provider)) as OpenAI.Chat.ChatCompletion;
        const response = completion.choices?.[0]?.message?.content ?? "";

        try {
            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    title: parsed.title || "Untitled Exploration",
                    tags: Array.isArray(parsed.tags) ? parsed.tags : ["general"]
                };
            }
        } catch (error) {
            console.error("Error parsing intent analysis response:", error);
        }

        // Fallback if JSON parsing fails
        return {
            title: query.length > 50 ? query.substring(0, 47) + "..." : query,
            tags: ["general", "exploration"]
        };
    }

    static async createNewMemo(request: CreateMemoRequest): Promise<CreateMemoResponse> {
        const {
            query,
            userId,
            provider = "gemini",
            searchOptions = {
                searchDepth: "basic",
                includeImages: true,
                maxResults: 3,
            }
        } = request;

        // Step 1: Analyze intent to generate title and tags
        const intentAnalysis = await this.analyzeIntent(query, provider);

        // Step 2: Create memo card in database
        const memoId = await dbService.createMemoCard(userId, intentAnalysis.title, intentAnalysis.tags);

        // Step 3: Perform search for the query
        const searchResults = await searchService.search(query, searchOptions);

        // Step 4: Generate root node content using LLM
        const messages = [
            {
                role: "system",
                content: this.readPromptFile('root-node-system-prompt.md'),
            },
            {
                role: "user",
                content: `This is the beginning of a new exploration. Please provide a comprehensive introduction to: "${query}"\n\nSearch results:\n${JSON.stringify(
                    searchResults
                )}\n\nProvide a thorough overview that sets the foundation for deeper exploration. Format the response in markdown with #### headers.`,
            },
        ];

        const completion = (await openAIService.createChatCompletion(messages, provider)) as OpenAI.Chat.ChatCompletion;
        const response = completion.choices?.[0]?.message?.content ?? "";

        // Step 5: Extract follow-up questions
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

        // Step 6: Extract image URLs from search results
        const imageUrls = searchResults.images
            ? searchResults.images.map((img: any) => img.url).filter((url: string) => url)
            : [];

        // Step 7: Create conversation tree with root node
        const rootNodeId = "0";
        const treeData = {
            nodes: {
                [rootNodeId]: {
                    id: rootNodeId,
                    type: 'root',
                    question: query,
                    answer: mainResponse,
                    parentId: [],
                    children: [],
                    status: 'answered' as const,
                    imageUrls: imageUrls,
                    createdAt: new Date().toISOString()
                }
            },
            rootIds: [rootNodeId],
            nextNodeId: "1",
            metadata: {
                totalNodes: 1,
                maxDepth: 0,
                lastUpdated: new Date().toISOString()
            }
        };

        // Step 8: Save conversation tree to database
        await dbService.updateConversationTree(memoId, userId, treeData);

        // Step 9: Create follow-up nodes
        const newFollowUpNodeIds = await dbService.addMultipleChildNodes(memoId, userId, rootNodeId, followUpQuestions);

        // Step 10: Generate sources and images from search results
        const sources = searchResults.results.map((result: any) => ({
            title: result.title || "",
            url: result.url || "",
            uri: result.url || "",
            author: result.author || "",
            image: result.image || "",
        }));

        const images = searchResults.images.map((result: any) => ({
            url: result.url,
            thumbnail: result.url,
            description: result.description || "",
        }));

        return {
            memoId,
            title: intentAnalysis.title,
            tags: intentAnalysis.tags,
            rootNodeId,
            answer: mainResponse,
            followUpQuestions,
            newFollowUpNodeIds,
            imageUrls,
            sources,
            images
        };
    }
} 