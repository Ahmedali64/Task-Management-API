import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'TaskFlow API is running!',
    timestamp: new Date().toString(),
    environment: process.env.NODE_ENV,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
