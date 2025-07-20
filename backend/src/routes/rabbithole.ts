import express from "express";
import { openAIService } from "../services/openaiService";
import { dbService } from "../services/dbService";
import { SearchAgent } from "../agent/searchAgent";
import { MemoAgent } from "../agent/memoAgent";
import { PodcastAgent } from "../agent/podcastAgent";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

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

interface CreateMemoRequest {
    query: string;
    userId: number;
    provider?: string;
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

interface SummarizeMemoRequest {
    memoId: number;
    userId: number;
    provider?: string;
}

interface SummarizeMemoResponse {
    summary: string;
    totalNodes: number;
    answeredNodes: number;
}

interface GeneratePodcastRequest {
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
}

interface GeneratePodcastResponse {
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
    followUpQuestions: string[];
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

export function setupRabbitHoleRoutes(_runtime: any) {
    const router = express.Router();



    /**
     * @swagger
     * /api/rabbitholes/memos/{userId}:
     *   get:
     *     summary: Get user memos
     *     description: Retrieves all memo cards for a specific user
     *     tags: [Memos]
     *     parameters:
     *       - in: path
     *         name: userId
     *         required: true
     *         schema:
     *           type: integer
     *         description: The user ID
     *     responses:
     *       200:
     *         description: Memos retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: integer
     *                     description: Memo ID
     *                   user_id:
     *                     type: integer
     *                     description: User ID
     *                   title:
     *                     type: string
     *                     description: Memo title
                      *                   tags:
                 *                     type: array
                 *                     items:
                 *                       type: string
                 *                     description: Memo tags
                 *                   image_urls:
                 *                     type: array
                 *                     items:
                 *                       type: string
                 *                     description: Image URLs associated with the memo
                 *                   created_at:
     *                     type: string
     *                     format: date-time
     *                     description: Creation timestamp
     *                   updated_at:
     *                     type: string
     *                     format: date-time
     *                     description: Last update timestamp
     *       400:
     *         description: Invalid user ID
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
    router.get("/rabbitholes/memos/:userId", async (req: express.Request, res: express.Response) => {
        try {
            const { userId } = req.params;
            const userIdNumber = parseInt(userId);
            
            if (isNaN(userIdNumber)) {
                return res.status(400).json({
                    error: "Invalid user ID"
                });
            }

            const memos = await dbService.getUserMemos(userIdNumber);
            res.json(memos);
        } catch (error) {
            console.error("Error getting user memos:", error);
            res.status(500).json({
                error: "Failed to get user memos",
                details: (error as Error).message,
            });
        }
    });

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

            // Get or create conversation tree
            let treeData = await dbService.getConversationTree(memoId, userId);
            if (!treeData) {
                // Create a new conversation tree if it doesn't exist
                treeData = {
                    nodes: {},
                    rootIds: [],
                    nextNodeId: "1",
                    metadata: {
                        totalNodes: 0,
                        maxDepth: 0,
                        lastUpdated: new Date().toISOString()
                    }
                };
                await dbService.updateConversationTree(memoId, userId, treeData);
            }

            // Create the node if it doesn't exist
            if (!treeData.nodes[nodeId]) {
                const newNode: any = {
                    id: nodeId,
                    type: 'node',
                    question: query,
                    answer: null,
                    parentId: [],
                    children: [],
                    status: 'pending',
                    imageUrls: [],
                    createdAt: new Date().toISOString()
                };
                
                treeData.nodes[nodeId] = newNode;
                treeData.rootIds.push(nodeId);
                treeData.metadata.totalNodes++;
                treeData.metadata.lastUpdated = new Date().toISOString();
                await dbService.updateConversationTree(memoId, userId, treeData);
            }

            // Get conversation path from current node to root
            const conversationPath = await dbService.getConversationPath(memoId, userId, nodeId);

            // Use SearchAgent to process the search and generate response
            const agentResponse = await SearchAgent.processSearchResults({
                query,
                concept,
                followUpMode,
                conversationPath,
                provider: "gemini",
                searchOptions: {
                    searchDepth: "basic",
                    includeImages: true,
                    maxResults: 3,
                }
            });

            const { mainResponse, followUpQuestions, imageUrls, sources, images } = agentResponse;

            // Update the node with the answer and image URLs
            await dbService.updateNodeAnswer(memoId, userId, nodeId, mainResponse, imageUrls);

            // Create follow-up nodes
            const newFollowUpNodeIds = await dbService.addMultipleChildNodes(memoId, userId, nodeId, followUpQuestions);

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

            // Use SearchAgent to process the add node request
            const agentResponse = await SearchAgent.processAddNodeRequest({
                question,
                conversationPath,
                provider,
                searchOptions: {
                    searchDepth: "basic",
                    includeImages: true,
                    maxResults: 3,
                }
            });

            const { answer, followUpQuestions, imageUrls, sources, images } = agentResponse;

            // Add the new node with the answer and image URLs
            const newNodeId = await dbService.addChildNode(memoId, userId, parentId, question, answer, imageUrls);

            // Create follow-up nodes for the new node
            const newFollowUpNodeIds = await dbService.addMultipleChildNodes(memoId, userId, newNodeId, followUpQuestions);

            const addNodeResponse: AddNodeResponse = {
                nodeId: newNodeId,
                question,
                answer,
                parentId,
                followUpQuestions,
                newFollowUpNodeIds,
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

    /**
     * @swagger
     * /api/rabbitholes/create-memo:
     *   post:
     *     summary: Create a new memo with conversation tree
     *     description: Creates a new memo by analyzing user intent, generating title and tags, then creating a root node with AI-generated content and follow-up questions
     *     tags: [Memo Management]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateMemoRequest'
     *           example:
     *             query: "How do neural networks work?"
     *             userId: 1
     *             provider: "gemini"
     *     responses:
     *       200:
     *         description: Memo created successfully with root node and follow-up questions
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CreateMemoResponse'
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
    router.post("/rabbitholes/create-memo", async (req: express.Request, res: express.Response) => {
        try {
            const {
                query,
                userId,
                provider = "gemini"
            } = req.body as CreateMemoRequest;

            // Validate required parameters
            if (!query || !userId) {
                return res.status(400).json({
                    error: "Missing required parameters: query or userId"
                });
            }

            // Use MemoAgent to create new memo with complete conversation tree
            const memoResponse = await MemoAgent.createNewMemo({
                query,
                userId,
                provider,
                searchOptions: {
                    searchDepth: "basic",
                    includeImages: true,
                    maxResults: 3,
                }
            });

            const createMemoResponse: CreateMemoResponse = {
                memoId: memoResponse.memoId,
                title: memoResponse.title,
                tags: memoResponse.tags,
                rootNodeId: memoResponse.rootNodeId,
                answer: memoResponse.answer,
                followUpQuestions: memoResponse.followUpQuestions,
                newFollowUpNodeIds: memoResponse.newFollowUpNodeIds,
                imageUrls: memoResponse.imageUrls,
                sources: memoResponse.sources,
                images: memoResponse.images,
            };

            res.json(createMemoResponse);
        } catch (error) {
            console.error("Error in create memo endpoint:", error);
            res.status(500).json({
                error: "Failed to create memo",
                details: (error as Error).message,
            });
        }
    });

    /**
     * @swagger
     * /api/rabbitholes/summarize-memo:
     *   post:
     *     summary: Summarize a memo's conversation tree
     *     description: Generates a comprehensive summary of all answered nodes in a memo's conversation tree using breadth-first traversal
     *     tags: [Memo Management]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SummarizeMemoRequest'
     *           example:
     *             memoId: 1
     *             userId: 1
     *             provider: "gemini"
     *     responses:
     *       200:
     *         description: Memo summarized successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SummarizeMemoResponse'
     *       400:
     *         description: Missing required parameters
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       404:
     *         description: Memo or conversation tree not found
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
    router.post("/rabbitholes/summarize-memo", async (req: express.Request, res: express.Response) => {
        try {
            const {
                memoId,
                userId,
                provider = "gemini"
            } = req.body as SummarizeMemoRequest;

            // Validate required parameters
            if (!memoId || !userId) {
                return res.status(400).json({
                    error: "Missing required parameters: memoId or userId"
                });
            }

            // Get the memo information
            const userMemos = await dbService.getUserMemos(userId);
            const memo = userMemos.find(m => m.id === memoId);
            if (!memo) {
                return res.status(404).json({
                    error: "Memo not found"
                });
            }

            // Get conversation tree
            const treeData = await dbService.getConversationTree(memoId, userId);
            if (!treeData) {
                return res.status(404).json({
                    error: "Conversation tree not found"
                });
            }

            // Perform breadth-first traversal to collect all answered nodes
            interface QAContent {
                question: string;
                answer: string;
                nodeId: string;
                depth: number;
            }

            const answeredContents: QAContent[] = [];
            const queue: Array<{ nodeId: string, depth: number }> = [];
            const visited = new Set<string>();

            // Start with root nodes
            for (const rootId of treeData.rootIds) {
                queue.push({ nodeId: rootId, depth: 0 });
            }

            // Breadth-first traversal
            while (queue.length > 0) {
                const { nodeId, depth } = queue.shift()!;
                
                if (visited.has(nodeId)) continue;
                visited.add(nodeId);

                const node = treeData.nodes[nodeId];
                if (!node) continue;

                // Collect answered nodes
                if (node.status === 'answered' && node.answer) {
                    answeredContents.push({
                        question: node.question,
                        answer: node.answer,
                        nodeId: node.id,
                        depth: depth
                    });
                }

                // Add children to queue
                for (const childId of node.children) {
                    if (!visited.has(childId)) {
                        queue.push({ nodeId: childId, depth: depth + 1 });
                    }
                }
            }

            if (answeredContents.length === 0) {
                return res.status(400).json({
                    error: "No answered content found in this memo"
                });
            }

            // Prepare content for summarization
            const contentForSummary = answeredContents.map((content, index) => 
                `${index + 1}. Q: ${content.question}\n   A: ${content.answer}`
            ).join('\n\n');

            // Generate summary using LLM
            const messages = [
                {
                    role: "system",
                    content: `You are an expert at creating comprehensive summaries of conversation trees. Your task is to analyze a series of questions and answers from a knowledge exploration session and create a coherent, insightful summary that captures the key themes, insights, and conclusions.

Please provide:
1. A brief introduction about the main topic
2. Key findings and insights organized logically
3. Important conclusions or takeaways
4. Any patterns or connections between different parts of the conversation

Format your response in clear, readable sections with markdown formatting.`
                },
                {
                    role: "user",
                    content: `Please summarize this conversation tree about "${memo.title}".

Tags: ${memo.tags.join(', ')}

Conversation Content (${answeredContents.length} answered questions):

${contentForSummary}

Please provide a comprehensive summary that captures the essence of this exploration and its key insights.`
                }
            ];

            const completion = await openAIService.createChatCompletion(messages, provider);
            const summary = completion.choices?.[0]?.message?.content ?? "Failed to generate summary";

            const summarizeMemoResponse: SummarizeMemoResponse = {
                summary: summary,
                totalNodes: Object.keys(treeData.nodes).length,
                answeredNodes: answeredContents.length
            };

            res.json(summarizeMemoResponse);
        } catch (error) {
            console.error("Error in summarize memo endpoint:", error);
            res.status(500).json({
                error: "Failed to summarize memo",
                details: (error as Error).message,
            });
        }
    });

    /**
     * @swagger
     * /api/rabbitholes/generate-podcast:
     *   post:
     *     summary: Generate podcast from memo content
     *     description: Creates a podcast script and audio file based on a memo's conversation tree summary
     *     tags: [Podcast Generation]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/GeneratePodcastRequest'
     *           example:
     *             memoId: 1
     *             userId: 1
     *             provider: "gemini"
     *             config:
     *               podcastName: "AI深度解析"
     *               hostName: "Alex"
     *               guestName: "Dr. Smith"
     *               wordCount: 800
     *     responses:
     *       200:
     *         description: Podcast generated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GeneratePodcastResponse'
     *       400:
     *         description: Missing required parameters or no answered content
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       404:
     *         description: Memo or conversation tree not found
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
    router.post("/rabbitholes/generate-podcast", async (req: express.Request, res: express.Response) => {
        try {
            const {
                memoId,
                userId,
                provider = "gemini",
                config = {}
            } = req.body as GeneratePodcastRequest;

            // Validate required parameters
            if (!memoId || !userId) {
                return res.status(400).json({
                    error: "Missing required parameters: memoId or userId"
                });
            }

            console.log(`Starting podcast generation for memo ${memoId}, user ${userId}`);

            // Step 1: Get memo information and conversation tree summary
            const userMemos = await dbService.getUserMemos(userId);
            const memo = userMemos.find(m => m.id === memoId);
            if (!memo) {
                return res.status(404).json({
                    error: "Memo not found"
                });
            }

            // Get conversation tree
            const treeData = await dbService.getConversationTree(memoId, userId);
            if (!treeData) {
                return res.status(404).json({
                    error: "Conversation tree not found"
                });
            }

            // Perform breadth-first traversal to collect all answered nodes
            interface QAContent {
                question: string;
                answer: string;
                nodeId: string;
                depth: number;
            }

            const answeredContents: QAContent[] = [];
            const queue: Array<{ nodeId: string, depth: number }> = [];
            const visited = new Set<string>();

            // Start with root nodes
            for (const rootId of treeData.rootIds) {
                queue.push({ nodeId: rootId, depth: 0 });
            }

            // Breadth-first traversal
            while (queue.length > 0) {
                const { nodeId, depth } = queue.shift()!;
                
                if (visited.has(nodeId)) continue;
                visited.add(nodeId);

                const node = treeData.nodes[nodeId];
                if (!node) continue;

                // Collect answered nodes
                if (node.status === 'answered' && node.answer) {
                    answeredContents.push({
                        question: node.question,
                        answer: node.answer,
                        nodeId: node.id,
                        depth: depth
                    });
                }

                // Add children to queue
                for (const childId of node.children) {
                    if (!visited.has(childId)) {
                        queue.push({ nodeId: childId, depth: depth + 1 });
                    }
                }
            }

            if (answeredContents.length === 0) {
                return res.status(400).json({
                    error: "No answered content found in this memo to generate podcast"
                });
            }

            // Step 2: Prepare content for podcast generation
            const contentForPodcast = `# ${memo.title}

标签: ${memo.tags.join(', ')}

## 对话内容摘要

以下是从这个知识探索对话中提取的主要问答内容：

${answeredContents.map((content, index) => 
                `${index + 1}. **问题**: ${content.question}
   
   **回答**: ${content.answer}`
            ).join('\n\n')}

## 总体信息
- 总节点数: ${Object.keys(treeData.nodes).length}
- 已回答节点数: ${answeredContents.length}
- 主题探索深度: ${Math.max(...answeredContents.map(c => c.depth)) + 1} 层

请基于以上内容生成引人入胜的播客对话。`;

            // Step 3: Generate podcast using PodcastAgent
            console.log('Generating podcast with PodcastAgent...');
            const podcastResult = await PodcastAgent.generatePodcast({
                content: contentForPodcast,
                userId,
                memoId,
                memoTitle: memo.title,
                memoTags: memo.tags,
                config,
                provider
            });

            // Step 4: Prepare response URLs
            const audioUrl = `/api/rabbitholes/download-podcast/${podcastResult.audioFileName}`;
            const scriptUrl = `/api/rabbitholes/download-podcast/${podcastResult.scriptFileName}`;

            const generatePodcastResponse: GeneratePodcastResponse = {
                success: podcastResult.success,
                script: podcastResult.script,
                audioFileName: podcastResult.audioFileName,
                audioUrl: audioUrl,
                scriptFileName: podcastResult.scriptFileName,
                scriptUrl: scriptUrl,
                timestamp: podcastResult.timestamp,
                summary: `基于 "${memo.title}" 的播客已成功生成，包含${answeredContents.length}个回答节点的内容。`,
                totalNodes: Object.keys(treeData.nodes).length,
                answeredNodes: answeredContents.length
            };

            console.log(`Podcast generation completed successfully:
                Audio: ${podcastResult.audioFileName}
                Script: ${podcastResult.scriptFileName}`);

            res.json(generatePodcastResponse);
        } catch (error) {
            console.error("Error in generate podcast endpoint:", error);
            res.status(500).json({
                error: "Failed to generate podcast",
                details: (error as Error).message,
            });
        }
    });

    /**
     * @swagger
     * /api/rabbitholes/download-podcast/{filename}:
     *   get:
     *     summary: Download podcast files
     *     description: Download generated podcast audio or script files
     *     tags: [Podcast Generation]
     *     parameters:
     *       - in: path
     *         name: filename
     *         required: true
     *         schema:
     *           type: string
     *         description: The filename of the podcast file to download
     *     responses:
     *       200:
     *         description: File downloaded successfully
     *         content:
     *           audio/wav:
     *             schema:
     *               type: string
     *               format: binary
     *           text/plain:
     *             schema:
     *               type: string
     *       404:
     *         description: File not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get("/rabbitholes/download-podcast/:filename", async (req: express.Request, res: express.Response) => {
        try {
            const filename = req.params.filename;
            const podcastDir = path.join(process.cwd(), 'podcast_outputs');
            const filePath = path.join(podcastDir, filename);

            // 检查文件是否存在
            try {
                await fs.promises.access(filePath);
            } catch (error) {
                return res.status(404).json({
                    error: "Podcast file not found"
                });
            }

            // 设置适当的 Content-Type
            if (filename.endsWith('.wav')) {
                res.setHeader('Content-Type', 'audio/wav');
            } else if (filename.endsWith('.txt')) {
                res.setHeader('Content-Type', 'text/plain');
            }

            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.sendFile(path.resolve(filePath));
        } catch (error) {
            console.error('Podcast file download error:', error);
            res.status(500).json({
                error: "Failed to download podcast file",
                details: (error as Error).message
            });
        }
    });

    /**
     * @swagger
     * /api/rabbitholes/podcast-voices:
     *   get:
     *     summary: Get available podcast voice options
     *     description: Returns information about available voices for podcast generation
     *     tags: [Podcast Generation]
     *     responses:
     *       200:
     *         description: Voice options retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 voices:
     *                   type: array
     *                   items:
     *                     type: string
     *                   description: List of available voice names
     *                 defaultVoices:
     *                   type: object
     *                   properties:
     *                     host:
     *                       type: string
     *                     guest:
     *                       type: string
     *                   description: Default voice assignments
     */
    router.get("/rabbitholes/podcast-voices", async (req: express.Request, res: express.Response) => {
        try {
            const voiceOptions = PodcastAgent.getVoiceOptions();
            res.json(voiceOptions);
        } catch (error) {
            console.error("Error getting podcast voice options:", error);
            res.status(500).json({
                error: "Failed to get podcast voice options",
                details: (error as Error).message,
            });
        }
    });

    return router;
} 