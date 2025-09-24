import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  idParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validation.middleware';
import { taskFiltersSchema, updateTaskSchema } from '../utils/validation.util';
import {
  assignTask,
  deleteTaskById,
  getAllTasks,
  getMyTasks,
  getTask,
  unassignTask,
  updateTaskById,
} from '../controllers/task.controller';
import { requireTaskAccess } from '../middleware/permissions.middleware';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// General task routes
router.get('/', validateQuery(taskFiltersSchema), getAllTasks);
router.get('/my-tasks', getMyTasks);
router.get('/:id', validateParams(idParamSchema), requireTaskAccess, getTask);
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTaskSchema),
  requireTaskAccess,
  updateTaskById
);
router.delete(
  '/:id',
  validateParams(idParamSchema),
  requireTaskAccess,
  deleteTaskById
);

router.put('/:id/assign', assignTask);
router.put('/:id/unassign', unassignTask);
export default router;
