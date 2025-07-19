import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MemRing Strategy AI API',
      version: '1.0.0',
      description: 'API for managing conversation trees and AI-powered research exploration',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      schemas: {
        TreeNode: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique node identifier' },
            type: { type: 'string', enum: ['root', 'node'], description: 'Node type' },
            question: { type: 'string', description: 'The question for this node' },
            answer: { type: ['string', 'null'], description: 'The answer (null for pending nodes)' },
            parentId: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of parent node IDs' 
            },
            children: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of child node IDs' 
            },
            status: { type: 'string', enum: ['pending', 'answered'], description: 'Node status' },
            imageUrls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of image URLs related to this node'
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' }
          },
          required: ['id', 'type', 'question', 'parentId', 'children', 'status', 'imageUrls', 'createdAt']
        },
        TreeData: {
          type: 'object',
          properties: {
            nodes: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/TreeNode' },
              description: 'Map of node ID to node data'
            },
            rootIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of root node IDs'
            },
            nextNodeId: { type: 'string', description: 'Next available node ID' },
            metadata: {
              type: 'object',
              properties: {
                totalNodes: { type: 'integer', description: 'Total number of nodes' },
                maxDepth: { type: 'integer', description: 'Maximum tree depth' },
                lastUpdated: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
              }
            }
          }
        },
        SearchRequest: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query or question to answer' },
            userId: { type: 'integer', description: 'User ID' },
            memoId: { type: 'integer', description: 'Memo card ID' },
            nodeId: { type: 'string', description: 'Target node ID to answer' },
            concept: { type: 'string', description: 'Optional concept context' },
            followUpMode: { 
              type: 'string', 
              enum: ['expansive', 'focused'], 
              default: 'expansive',
              description: 'Follow-up question generation mode' 
            },
            provider: { type: 'string', description: 'AI provider to use' }
          },
          required: ['query', 'userId', 'memoId', 'nodeId']
        },
        AddNodeRequest: {
          type: 'object',
          properties: {
            userId: { type: 'integer', description: 'User ID' },
            memoId: { type: 'integer', description: 'Memo card ID' },
            parentId: { type: 'string', description: 'Parent node ID' },
            question: { type: 'string', description: 'Question for the new node' },
            provider: { type: 'string', description: 'AI provider to use' }
          },
          required: ['userId', 'memoId', 'parentId', 'question']
        },
        Source: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Source title' },
            url: { type: 'string', description: 'Source URL' },
            uri: { type: 'string', description: 'Source URI' },
            author: { type: 'string', description: 'Source author' },
            image: { type: 'string', description: 'Source image URL' }
          }
        },
        Image: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Image URL' },
            thumbnail: { type: 'string', description: 'Thumbnail URL' },
            description: { type: 'string', description: 'Image description' }
          }
        },
        SearchResponse: {
          type: 'object',
          properties: {
            response: { type: 'string', description: 'AI-generated response' },
            followUpQuestions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Generated follow-up questions'
            },
            contextualQuery: { type: 'string', description: 'The processed query' },
            nodeId: { type: 'string', description: 'The answered node ID' },
            newFollowUpNodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of newly created follow-up nodes'
            },
            sources: {
              type: 'array',
              items: { $ref: '#/components/schemas/Source' },
              description: 'Source references'
            },
            images: {
              type: 'array',
              items: { $ref: '#/components/schemas/Image' },
              description: 'Related images'
            }
          }
        },
        AddNodeResponse: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'New node ID' },
            question: { type: 'string', description: 'Node question' },
            answer: { type: 'string', description: 'AI-generated answer' },
            parentId: { type: 'string', description: 'Parent node ID' },
            sources: {
              type: 'array',
              items: { $ref: '#/components/schemas/Source' },
              description: 'Source references'
            },
            images: {
              type: 'array',
              items: { $ref: '#/components/schemas/Image' },
              description: 'Related images'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
            details: { type: 'string', description: 'Error details' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'], // 路径到包含 Swagger 注释的文件
};

export const specs = swaggerJsdoc(options); 