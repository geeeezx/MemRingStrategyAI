import express from "express";
import { tavily } from "@tavily/core";
import { openAIService } from "../services/openaiService";
import { dbService } from "../services/dbService";
import { mockDataService } from "../services/mockDataService";
import OpenAI from "openai";

interface RabbitHoleSearchRequest {
    query: string;
    userId: number;
    memoId: number;
    nodeId: string;
    concept?: string;
    followUpMode?: "expansive" | "focused";
    provider?: string;
}

interface AddNodeRequest {
    userId: number;
    memoId: number;
    parentId: string;
    question: string;
    provider?: string;
}

interface AddNodeRequest {
    userId: number;
    memoId: number;
    parentId: string;
    question: string;
    provider?: string;
}

interface SearchResponse {
    response: string;
    followUpQuestions: string[];
    contextualQuery: string;
    nodeId: string;
    newFollowUpNodeIds: string[];
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

interface AddNodeResponse {
    nodeId: string;
    question: string;
    answer: string;
    parentId: string;
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

    /**
     * @swagger
     * /api/rabbitholes/providers:
     *   get:
     *     summary: Get available AI providers
     *     description: Returns information about available AI providers and their configurations
     *     tags: [Providers]
     *     responses:
     *       200:
     *         description: Provider information retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 defaultProvider:
     *                   type: string
     *                   description: The default AI provider
     *                 availableProviders:
     *                   type: array
     *                   items:
     *                     type: string
     *                   description: List of available providers
     *                 providerConfigs:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       provider:
     *                         type: string
     *                       model:
     *                         type: string
     *                       available:
     *                         type: boolean
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
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

    /**
     * @swagger
     * /api/rabbitholes/tree/{memoId}/{userId}:
     *   get:
     *     summary: Get conversation tree structure
     *     description: Retrieves the complete conversation tree structure for a specific memo and user
     *     tags: [Conversation Tree]
     *     parameters:
     *       - in: path
     *         name: memoId
     *         required: true
     *         schema:
     *           type: integer
     *         description: The memo card ID
     *       - in: path
     *         name: userId
     *         required: true
     *         schema:
     *           type: integer
     *         description: The user ID
     *     responses:
     *       200:
     *         description: Tree structure retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TreeData'
     *       404:
     *         description: Conversation tree not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get("/rabbitholes/tree/:memoId/:userId", async (req: express.Request, res: express.Response) => {
        try {
            const { memoId, userId } = req.params;
            const treeData = await dbService.getConversationTree(parseInt(memoId), parseInt(userId));
            
            if (!treeData) {
                return res.status(404).json({
                    error: "Conversation tree not found"
                });
            }

            res.json(treeData);
        } catch (error) {
            console.error("Error getting conversation tree:", error);
            res.status(500).json({
                error: "Failed to get conversation tree",
                details: (error as Error).message,
            });
        }
    });

    /**
     * @swagger
     * /api/rabbitholes/search:
     *   post:
     *     summary: Search and answer pending node
     *     description: Answers a pending node by performing web search and AI processing, then creates follow-up questions as new pending nodes. Also stores related image URLs in the node.
     *     tags: [Search & Answer]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SearchRequest'
     *           example:
     *             query: "What is the significance of the weighing of the heart ceremony?"
     *             userId: 1
     *             memoId: 1
     *             nodeId: "2"
     *             concept: "Egyptian mythology"
     *             followUpMode: "expansive"
     *             provider: "openai"
     *     responses:
     *       200:
     *         description: Node answered successfully with follow-up questions created
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SearchResponse'
     *       400:
     *         description: Missing required parameters
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post("/rabbitholes/search", async (req: express.Request, res: express.Response) => {
        try {
            const {
                query,
                userId,
                memoId,
                nodeId,
                concept,
                followUpMode = "expansive",
            } = req.body as RabbitHoleSearchRequest;

            // Validate required parameters
            if (!userId || !memoId || !nodeId) {
                return res.status(400).json({
                    error: "Missing required parameters: userId, memoId, or nodeId"
                });
            }

            // Get conversation path from current node to root
            const conversationPath = await dbService.getConversationPath(memoId, userId, nodeId);

            // Perform search
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

            // Build conversation context
            const conversationContext = conversationPath
                .map(msg => `User: ${msg.user}\nAssistant: ${msg.assistant}\n`)
                .join("\n");

            const messages = [
                {
                    role: "system",
                    content: `You are an AI assistant that helps users explore topics in depth. Format your responses using markdown with headers (####).

Your goal is to provide comprehensive, accurate information while maintaining engagement.
Base your response on the search results provided, and structure it clearly with relevant sections.

After your main response, include a "Follow-up Questions:" section with 3 concise questions that would help users explore the topic further.
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

            const completion = (await openAIService.createChatCompletion(messages, "gemini")) as OpenAI.Chat.ChatCompletion;
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

            // Update the node with the answer and image URLs
            await dbService.updateNodeAnswer(memoId, userId, nodeId, mainResponse, imageUrls);

            // Create follow-up nodes
            const newFollowUpNodeIds = await dbService.addMultipleChildNodes(memoId, userId, nodeId, followUpQuestions);

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

            const searchResponse: SearchResponse = {
                response: mainResponse,
                followUpQuestions,
                contextualQuery: query,
                nodeId,
                newFollowUpNodeIds,
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

    /**
     * @swagger
     * /api/rabbitholes/add-node:
     *   post:
     *     summary: Add a new child node
     *     description: Creates a new child node under any existing node, immediately gets an AI answer, stores related image URLs, and returns the completed node
     *     tags: [Node Management]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AddNodeRequest'
     *           example:
     *             userId: 1
     *             memoId: 1
     *             parentId: "0"
     *             question: "What role did Anubis play in the afterlife?"
     *             provider: "openai"
     *     responses:
     *       200:
     *         description: Node created and answered successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AddNodeResponse'
     *       400:
     *         description: Missing required parameters
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post("/rabbitholes/add-node", async (req: express.Request, res: express.Response) => {
        try {
            const {
                userId,
                memoId,
                parentId,
                question,
                provider,
            } = req.body as AddNodeRequest;

            // Validate required parameters
            if (!userId || !memoId || !parentId || !question) {
                return res.status(400).json({
                    error: "Missing required parameters: userId, memoId, parentId, or question"
                });
            }

            // Get conversation path from parent node to root
            const conversationPath = await dbService.getConversationPath(memoId, userId, parentId);

            // Perform search for the new question
            const searchResults = await tavilyClient.search(question, {
                searchDepth: "basic",
                includeImages: true,
                maxResults: 3,
            });

            // Build conversation context
            const conversationContext = conversationPath
                .map(msg => `User: ${msg.user}\nAssistant: ${msg.assistant}\n`)
                .join("\n");

            const messages = [
                {
                    role: "system",
                    content: `You are an AI assistant that helps users explore topics in depth. Format your responses using markdown with headers (####).

Your goal is to provide comprehensive, accurate information while maintaining engagement.
Base your response on the search results provided, and structure it clearly with relevant sections.
`,
                },
                {
                    role: "user",
                    content: `Previous conversation:\n${conversationContext}\n\nSearch results about "${question}":\n${JSON.stringify(
                        searchResults
                    )}\n\nPlease provide a comprehensive response about "${question}". Include relevant facts, context, and relationships to other topics. Format the response in markdown with #### headers.`,
                },
            ];

            const completion = (await openAIService.createChatCompletion(messages, provider)) as OpenAI.Chat.ChatCompletion;
            const answer = completion.choices?.[0]?.message?.content ?? "";

            // Extract image URLs from search results
            const imageUrls = searchResults.images
                ? searchResults.images.map((img: any) => img.url).filter((url: string) => url)
                : [];

            // Add the new node with the answer and image URLs
            const newNodeId = await dbService.addChildNode(memoId, userId, parentId, question, answer, imageUrls);

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

            const addNodeResponse: AddNodeResponse = {
                nodeId: newNodeId,
                question,
                answer,
                parentId,
                sources,
                images,
            };

            res.json(addNodeResponse);
        } catch (error) {
            console.error("Error in add node endpoint:", error);
            res.status(500).json({
                error: "Failed to add node",
                details: (error as Error).message,
            });
        }
    });

    return router;
} 