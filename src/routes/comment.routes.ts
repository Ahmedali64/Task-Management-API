import { Router } from 'express';
import {
  getComment,
  updateCommentById,
  deleteCommentById,
} from '../controllers/comment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All comment routes require authentication
router.use(authMiddleware);

// Comment CRUD operations
router.get('/:id', getComment);
router.put('/:id', updateCommentById);
router.delete('/:id', deleteCommentById);

export default router;
