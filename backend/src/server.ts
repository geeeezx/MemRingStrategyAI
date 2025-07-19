import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { setupRabbitHoleRoutes } from './routes/rabbithole';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 动态生成swagger配置
const swaggerOptions = {
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
          : `http://localhost:${port}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      schemas: {
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
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MemRing Strategy AI API Documentation'
}));

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use('/api', setupRabbitHoleRoutes(null));

// Serve static files from the React frontend app (only in production)
if (!isDevelopment) {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  // Handle any remaining requests by serving the index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
} else {
  // In development, just return a message for non-API routes
  app.get('*', (req, res) => {
    res.json({ 
      message: 'Backend API server is running in development mode',
      apiDocs: `http://localhost:${port}/api-docs`,
      health: `http://localhost:${port}/api/health`
    });
  });
}

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
  if (isDevelopment) {
    console.log('Running in development mode - frontend should be served separately');
  }
}); 