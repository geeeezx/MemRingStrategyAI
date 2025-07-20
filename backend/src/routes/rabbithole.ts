import express from "express";
import { openAIService } from "../services/openaiService";
import { dbService } from "../services/dbService";
import { SearchAgent } from "../agent/searchAgent";
import { MemoAgent } from "../agent/memoAgent";
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

    return router;
} 