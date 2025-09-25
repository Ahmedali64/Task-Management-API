import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { successResponse } from './utils/response.util';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import commentRoutes from './routes/comment.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'], // If you want to use session with scrf u can add X-CSRF-Token here as a header
  })
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbStatus = await testDatabaseConnection();
    const healthData = {
      status: 'healthy',
      message: 'TaskFlow API is running!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbStatus,
    };

    return successResponse(res, healthData, 'API is healthy');
  } catch {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Service temporarily unavailable',
        details: 'Database connection failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

async function testDatabaseConnection() {
  try {
    const prisma = (await import('./config/database')).default;
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected', message: 'Database connected' };
  } catch {
    return { status: 'disconnected', message: 'Database connection failed' };
  }
}

const limiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 5 }); // 5 req per min
app.use(limiter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
// If there is no matching route just go to this one and do not use '*' app will crash
// cause he will think that this is just a string not a wildcard
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
