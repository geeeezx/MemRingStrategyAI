import { Pool, Client } from 'pg';

interface TreeNode {
    id: string;
    type: string;
    question: string;
    answer: string | null;
    parentId: string[];
    children: string[];
    status: 'pending' | 'answered';
    imageUrls: string[];
    createdAt: string;
}

interface TreeData {
    nodes: { [key: string]: TreeNode };
    rootIds: string[];
    nextNodeId: string;
    metadata: {
        totalNodes: number;
        maxDepth: number;
        lastUpdated: string;
    };
}

interface MemoCard {
    id: number;
    user_id: number;
    title: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export class DatabaseService {
    private pool: Pool;

    constructor() {
        // 更完整的数据库连接配置
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'memring',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        };

        // 如果有完整的DATABASE_URL，优先使用
        if (process.env.DATABASE_URL) {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            });
        } else {
            this.pool = new Pool(dbConfig);
        }

        // 测试连接
        this.testConnection();
    }

    private async testConnection() {
        try {
            const client = await this.pool.connect();
            console.log('✅ 数据库连接成功');
            client.release();
        } catch (error) {
            console.error('❌ 数据库连接失败:', error);
            console.log('💡 请检查以下环境变量:');
            console.log('   - DATABASE_URL (完整连接字符串)');
            console.log('   - 或者分别设置: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
        }
    }

    async getUserMemos(userId: number): Promise<MemoCard[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT id, user_id, title, tags, created_at, updated_at FROM memo_cards WHERE user_id = $1 ORDER BY updated_at DESC',
                [userId]
            );
            
            return result.rows.map(row => ({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                tags: row.tags || [],
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
        } finally {
            client.release();
        }
    }

    async getConversationTree(memoId: number, userId: number): Promise<TreeData | null> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT tree_data FROM memo_conversations WHERE memo_id = $1 AND user_id = $2',
                [memoId, userId]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return result.rows[0].tree_data as TreeData;
        } finally {
            client.release();
        }
    }

    async updateConversationTree(memoId: number, userId: number, treeData: TreeData): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO memo_conversations (memo_id, user_id, tree_data, node_counter, updated_at) 
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                 ON CONFLICT (memo_id, user_id) 
                 DO UPDATE SET tree_data = $3, node_counter = $4, updated_at = CURRENT_TIMESTAMP`,
                [memoId, userId, JSON.stringify(treeData), treeData.metadata.totalNodes]
            );
        } finally {
            client.release();
        }
    }

    async getConversationPath(memoId: number, userId: number, nodeId: string): Promise<Array<{user: string, assistant: string}>> {
        const treeData = await this.getConversationTree(memoId, userId);
        if (!treeData) {
            return [];
        }

        const conversationPath: Array<{user: string, assistant: string}> = [];
        const visitedNodes = new Set<string>();
        
        // 递归函数来构建从根节点到当前节点的路径
        const buildPathToNode = (targetNodeId: string): boolean => {
            if (visitedNodes.has(targetNodeId)) {
                return false; // 避免循环
            }
            visitedNodes.add(targetNodeId);

            const node = treeData.nodes[targetNodeId];
            if (!node) return false;

            // 如果这是目标节点，开始构建路径
            if (targetNodeId === nodeId) {
                if (node.question && node.answer !== null) {
                    conversationPath.push({
                        user: node.question,
                        assistant: node.answer
                    });
                }
                return true;
            }

            // 检查是否在子节点中找到目标节点
            for (const childId of node.children) {
                if (buildPathToNode(childId)) {
                    // 如果在子节点中找到了目标节点，将当前节点添加到路径开头
                    if (node.question && node.answer !== null) {
                        conversationPath.unshift({
                            user: node.question,
                            assistant: node.answer
                        });
                    }
                    return true;
                }
            }

            return false;
        };

        // 从所有根节点开始搜索
        for (const rootId of treeData.rootIds) {
            visitedNodes.clear();
            if (buildPathToNode(rootId)) {
                break;
            }
        }

        return conversationPath;
    }

    async updateNodeAnswer(memoId: number, userId: number, nodeId: string, answer: string, imageUrls: string[] = []): Promise<void> {
        const treeData = await this.getConversationTree(memoId, userId);
        if (!treeData || !treeData.nodes[nodeId]) {
            throw new Error('Node not found');
        }

        treeData.nodes[nodeId].answer = answer;
        treeData.nodes[nodeId].status = 'answered';
        treeData.nodes[nodeId].imageUrls = imageUrls;
        treeData.metadata.lastUpdated = new Date().toISOString();

        await this.updateConversationTree(memoId, userId, treeData);
    }

    async addChildNode(memoId: number, userId: number, parentId: string, question: string, answer?: string, imageUrls: string[] = []): Promise<string> {
        const treeData = await this.getConversationTree(memoId, userId);
        if (!treeData) {
            throw new Error('Conversation tree not found');
        }

        if (!treeData.nodes[parentId]) {
            throw new Error('Parent node not found');
        }

        const newNodeId = treeData.nextNodeId;
        const newNode: TreeNode = {
            id: newNodeId,
            type: 'node',
            question,
            answer: answer || null,
            parentId: [parentId],
            children: [],
            status: answer ? 'answered' : 'pending',
            imageUrls: answer ? imageUrls : [],
            createdAt: new Date().toISOString()
        };

        // 添加新节点
        treeData.nodes[newNodeId] = newNode;
        
        // 将新节点添加到父节点的children数组中
        treeData.nodes[parentId].children.push(newNodeId);
        
        // 更新元数据
        treeData.nextNodeId = (parseInt(newNodeId) + 1).toString();
        treeData.metadata.totalNodes++;
        treeData.metadata.lastUpdated = new Date().toISOString();

        await this.updateConversationTree(memoId, userId, treeData);
        return newNodeId;
    }

    async addMultipleChildNodes(memoId: number, userId: number, parentId: string, questions: string[]): Promise<string[]> {
        const treeData = await this.getConversationTree(memoId, userId);
        if (!treeData) {
            throw new Error('Conversation tree not found');
        }

        if (!treeData.nodes[parentId]) {
            throw new Error('Parent node not found');
        }

        const newNodeIds: string[] = [];
        let nextId = parseInt(treeData.nextNodeId);

        for (const question of questions) {
            const newNodeId = nextId.toString();
            const newNode: TreeNode = {
                id: newNodeId,
                type: 'node',
                question,
                answer: null,
                parentId: [parentId],
                children: [],
                status: 'pending',
                imageUrls: [],
                createdAt: new Date().toISOString()
            };

            // 添加新节点
            treeData.nodes[newNodeId] = newNode;
            newNodeIds.push(newNodeId);
            
            // 将新节点添加到父节点的children数组中
            treeData.nodes[parentId].children.push(newNodeId);
            
            nextId++;
        }

        // 更新元数据
        treeData.nextNodeId = nextId.toString();
        treeData.metadata.totalNodes += questions.length;
        treeData.metadata.lastUpdated = new Date().toISOString();

        await this.updateConversationTree(memoId, userId, treeData);
        return newNodeIds;
    }

    // 计算树的最大深度
    private calculateMaxDepth(treeData: TreeData): number {
        let maxDepth = 0;
        
        const calculateNodeDepth = (nodeId: string, currentDepth: number, visited: Set<string>): number => {
            if (visited.has(nodeId)) return currentDepth;
            visited.add(nodeId);
            
            const node = treeData.nodes[nodeId];
            if (!node) return currentDepth;
            
            let maxChildDepth = currentDepth;
            for (const childId of node.children) {
                const childDepth = calculateNodeDepth(childId, currentDepth + 1, new Set(visited));
                maxChildDepth = Math.max(maxChildDepth, childDepth);
            }
            
            return maxChildDepth;
        };

        for (const rootId of treeData.rootIds) {
            const depth = calculateNodeDepth(rootId, 0, new Set());
            maxDepth = Math.max(maxDepth, depth);
        }

        return maxDepth;
    }

    // Create a new memo card
    async createMemoCard(userId: number, title: string, tags: string[]): Promise<number> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'INSERT INTO memo_cards (user_id, title, tags) VALUES ($1, $2, $3) RETURNING id',
                [userId, title, tags]
            );
            return result.rows[0].id;
        } catch (error) {
            console.error('Error creating memo card:', error);
            throw new Error('Failed to create memo card');
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}

export const dbService = new DatabaseService();