import expressAsyncHandler from 'express-async-handler';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Response } from 'express';
import {
  createTask,
  deleteTask,
  getProjectTasks,
  getTaskById,
  getTasks,
  getUserTasks,
  updateTask,
} from '../services/task.service';
import {
  createPaginationMeta,
  CreatePaginationOptionsInterface,
  createPaginationOptions,
} from '../utils/pagination.util';
import {
  createdResponse,
  paginatedResponse,
  successResponse,
} from '../utils/response.util';

type TaskFiltersQuery = {
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'IN_REVIEW' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  dueDate?: string;
  search?: string;
};

type TaskQueryParams = TaskFiltersQuery & CreatePaginationOptionsInterface;

interface AuthenticatedRequestWithTaskBody extends AuthenticatedRequest {
  body: {
    title: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'IN_REVIEW' | 'CANCELLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    description?: string | null | undefined;
    dueDate?: Date | null | undefined;
    assigneeId?: string | null | undefined;
  };
}

// Get all tasks (with filters)
export const getAllTasks = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, object, TaskQueryParams>,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    const paginationOptions = createPaginationOptions(req.query);
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      assigneeId: req.query.assigneeId,
      dueDate: req.query.dueDate,
      search: req.query.search,
    };
    const { tasks, total } = await getTasks(
      req.user.id,
      filters,
      paginationOptions
    );

    const paginationMeta = createPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );

    paginatedResponse(
      res,
      tasks,
      paginationMeta,
      'Tasks retrieved successfully'
    );
  }
);

// Get tasks for specific project
export const getTasksByProject = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<
      { projectId: string },
      object,
      object,
      TaskQueryParams
    >,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    const paginationOptions = createPaginationOptions(req.query);
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      assigneeId: req.query.assigneeId,
      dueDate: req.query.dueDate,
      search: req.query.search,
    };

    const { tasks, total } = await getProjectTasks(
      req.params.projectId,
      filters,
      paginationOptions
    );

    const paginationMeta = createPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );

    paginatedResponse(
      res,
      tasks,
      paginationMeta,
      'Project tasks retrieved successfully'
    );
  }
);

// Get user's assigned tasks
export const getMyTasks = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<
      object,
      object,
      object,
      CreatePaginationOptionsInterface
    >,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    const paginationOptions = createPaginationOptions(req.query);
    const { tasks, total } = await getUserTasks(req.user.id, paginationOptions);

    const paginationMeta = createPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );

    paginatedResponse(
      res,
      tasks,
      paginationMeta,
      'Your tasks retrieved successfully'
    );
  }
);

// Get task by ID
export const getTask = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const task = await getTaskById(req.params.id);
    successResponse(res, task, 'Task retrieved successfully');
  }
);

// Create new task in project
export const createNewTask = expressAsyncHandler(
  async (req: AuthenticatedRequestWithTaskBody, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    const task = await createTask(req.params.projectId, req.user.id, req.body);

    createdResponse(res, task, 'Task created successfully');
  }
);

// Update task
export const updateTaskById = expressAsyncHandler(
  async (req: AuthenticatedRequestWithTaskBody, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    const task = await updateTask(req.params.id, req.body);
    successResponse(res, task, 'Task updated successfully');
  }
);

// Delete task
export const deleteTaskById = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    await deleteTask(req.params.id);

    successResponse(res, null, 'Task deleted successfully');
  }
);

// Assign task to user
export const assignTask = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<{ id: string }, object, { assigneeId: string }>,
    res: Response
  ) => {
    const { assigneeId } = req.body;

    const task = await updateTask(req.params.id, { assigneeId });

    successResponse(res, task, 'Task assigned successfully');
  }
);

// Unassign task
export const unassignTask = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const task = await updateTask(req.params.id, { assigneeId: null });
    successResponse(res, task, 'Task unassigned successfully');
  }
);
