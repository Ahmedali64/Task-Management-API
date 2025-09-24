import { Router } from 'express';
import {
  getProjects,
  getProject,
  createNewProject,
  updateProjectById,
  deleteProjectById,
  addMember,
  updateMember,
  removeMember,
} from '../controllers/project.controller';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  requireProjectAccess,
  requireProjectManagement,
  requireProjectOwnership,
  requireTaskEdit,
} from '../middleware/permissions.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateMemberRoleSchema,
  taskFiltersSchema,
  createTaskSchema,
} from '../utils/validation.util';
import { idParamSchema } from '../middleware/validation.middleware';
import z from 'zod';
import {
  createNewTask,
  getTasksByProject,
} from '../controllers/task.controller';

const router = Router();

// All project routes require authentication
router.use(authMiddleware);

// Project CRUD operations
router.get('/', getProjects);
router.post('/', validateBody(createProjectSchema), createNewProject);

router.get(
  '/:id',
  validateParams(idParamSchema),
  requireProjectAccess(),
  getProject
);
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateProjectSchema),
  requireProjectManagement,
  updateProjectById
);
router.delete(
  '/:id',
  validateParams(idParamSchema),
  requireProjectOwnership,
  deleteProjectById
);

// Project member management
router.post(
  '/:id/members',
  validateParams(idParamSchema),
  validateBody(addProjectMemberSchema),
  requireProjectManagement,
  addMember
);

router.put(
  '/:id/members/:userId',
  validateParams(
    z.object({
      id: z.uuid('Invalid project ID'),
      userId: z.uuid('Invalid user ID'),
    })
  ),
  validateBody(updateMemberRoleSchema),
  requireProjectManagement,
  updateMember
);

router.delete(
  '/:id/members/:userId',
  validateParams(
    z.object({
      id: z.uuid('Invalid project ID'),
      userId: z.uuid('Invalid user ID'),
    })
  ),
  requireProjectManagement,
  removeMember
);

// Project task management
const projectIdSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

router.get(
  '/:projectId/tasks',
  validateParams(projectIdSchema),
  validateQuery(taskFiltersSchema),
  requireProjectAccess(),
  getTasksByProject
);

router.post(
  '/:projectId/tasks',
  validateParams(projectIdSchema),
  validateBody(createTaskSchema),
  requireTaskEdit,
  createNewTask
);
export default router;
