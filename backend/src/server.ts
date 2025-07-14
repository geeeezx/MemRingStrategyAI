import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import { setupRabbitHoleRoutes } from './routes/rabbithole';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

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

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Handle any remaining requests by serving the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
}); 