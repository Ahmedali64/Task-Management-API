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
import {
  createNewComment,
  getComments,
} from '../controllers/comment.controller';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// General task routes
/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks (optionally filtered)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE, IN_REVIEW, CANCELLED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *     responses:
 *       200:
 *         description: Paginated list of tasks
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTasksResponse'
 */
router.get('/', validateQuery(taskFiltersSchema), getAllTasks);
/**
 * @swagger
 * /api/tasks/my-tasks:
 *   get:
 *     summary: Get all tasks assigned to the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my tasks
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTasksResponse'
 */
router.get('/my-tasks', getMyTasks);
/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskResponse'
 *       404:
 *         description: Task not found
 */
router.get('/:id', validateParams(idParamSchema), requireTaskAccess, getTask);
/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskInput'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskResponse'
 *       404:
 *         description: Task not found
 */
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTaskSchema),
  requireTaskAccess,
  updateTaskById
);
/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  requireTaskAccess,
  deleteTaskById
);
/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   put:
 *     summary: Assign a user to a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task assigned successfully
 */
router.put('/:id/assign', assignTask);
/**
 * @swagger
 * /api/tasks/{id}/unassign:
 *   put:
 *     summary: Unassign a user from a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task unassigned successfully
 */
router.put('/:id/unassign', unassignTask);

// Routes for task comments
/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     summary: Get comments for a task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of comments for the task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentsResponse'
 *
 *   post:
 *     summary: Add a new comment to a task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "This needs to be fixed ASAP"
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 */
router.get('/:taskId/comments', getComments);
router.post('/:taskId/comments', createNewComment);
export default router;
