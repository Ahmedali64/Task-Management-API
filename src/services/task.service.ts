import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.middleware';
import { calculateSkip, PaginationOptions } from '../utils/pagination.util';
import {
  emitTaskCreated,
  emitTaskUpdate,
  emitTaskDeleted,
} from '../sockets/taskEvents';
import {
  cacheTaskDetails,
  getCachedTaskDetails,
  invalidateTaskCaches,
} from './cache.service';

interface TaskFiltersInput {
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'IN_REVIEW' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  dueDate?: string;
  search?: string;
}
interface CreateTaskInput {
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'IN_REVIEW' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description?: string | null;
  dueDate?: Date | null;
  assigneeId?: string | null;
}
interface UpdateTaskInput {
  title?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'IN_REVIEW' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description?: string | null;
  dueDate?: Date | null;
  assigneeId?: string | null;
  completedAt?: Date | null;
}
interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: string;
    name: string;
    color: string | null;
  };
  assignee: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  } | null;
  createdBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  _count: {
    comments: number;
    attachments: number;
  };
}

// Get tasks with filters and pagination
export const getTasks = async (
  userId: string,
  filters: TaskFiltersInput,
  options: PaginationOptions
): Promise<{ tasks: TaskResponse[]; total: number }> => {
  try {
    const skip = calculateSkip(options.page, options.limit);

    // Get all tasks that the user is allowed to see (Owner or a member in the project)
    // const test = prisma.task.findMany({
    //   where: {
    //     project: {
    //       OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    //     },
    //     // these will be added if user send anyone from them
    //     status: filters.status,
    //     priority: filters.priority,
    //     assigneeId: filters.assigneeId,
    //     dueDate: filters.dueDate,
    //   },
    // });
    const whereClause: Prisma.TaskWhereInput = {
      project: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
    };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.priority) {
      whereClause.priority = filters.priority;
    }

    if (filters.assigneeId) {
      whereClause.assigneeId = filters.assigneeId;
    }

    if (filters.dueDate) {
      const date = new Date(filters.dueDate);
      whereClause.dueDate = {
        // From 0 to 24 durning the day at any time
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    if (filters.search) {
      whereClause.OR = [
        {
          title: {
            contains: filters.search,
          },
        },
        {
          description: {
            contains: filters.search,
          },
        },
      ];
    }

    // Get tasks and total count
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: options.limit,
        orderBy: {
          [options.sortBy || 'createdAt']: options.sortOrder || 'desc',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    return { tasks, total };
  } catch {
    throw new ApiError('Failed to fetch tasks', 500);
  }
};

// Get tasks by project ID
export const getProjectTasks = async (
  projectId: string,
  filters: TaskFiltersInput,
  options: PaginationOptions
): Promise<{ tasks: TaskResponse[]; total: number }> => {
  try {
    const skip = calculateSkip(options.page, options.limit);

    const whereClause: Prisma.TaskWhereInput = {
      projectId,
    };

    // Apply filters (same as getTasks)
    if (filters.status) whereClause.status = filters.status;
    if (filters.priority) whereClause.priority = filters.priority;
    if (filters.assigneeId) whereClause.assigneeId = filters.assigneeId;

    if (filters.dueDate) {
      const date = new Date(filters.dueDate);
      whereClause.dueDate = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: options.limit,
        orderBy: {
          [options.sortBy || 'createdAt']: options.sortOrder || 'desc',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    return { tasks, total };
  } catch {
    throw new ApiError('Failed to fetch project tasks', 500);
  }
};

// Get task by ID
export const getTaskById = async (taskId: string): Promise<TaskResponse> => {
  try {
    const cachedTask =
      await getCachedTaskDetails<Promise<TaskResponse>>(taskId);
    if (cachedTask) {
      return cachedTask;
    }
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    if (!task) {
      throw new ApiError('Task not found', 404);
    }
    // Cache the result
    await cacheTaskDetails(taskId, task);
    return task;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch task', 500);
  }
};

//Create new task
export const createTask = async (
  projectId: string,
  userId: string,
  taskData: CreateTaskInput
): Promise<TaskResponse> => {
  try {
    // Validate assignee if provided
    if (taskData.assigneeId) {
      // Check if he exists and active or no
      const assignee = await prisma.user.findUnique({
        where: { id: taskData.assigneeId, isActive: true },
      });

      if (!assignee) {
        throw new ApiError('Assignee not found or inactive', 400);
      }
      // Check if he has access to the project or no
      const hasAccess = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: taskData.assigneeId },
            {
              members: {
                some: { userId: taskData.assigneeId },
              },
            },
          ],
        },
      });

      if (!hasAccess) {
        throw new ApiError(
          'Assignee does not have access to this project',
          400
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        ...taskData,
        projectId,
        createdById: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    emitTaskCreated({
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
      },
      projectId,
      createdBy: {
        id: userId,
        email: task.createdBy.email,
        username: task.createdBy.username,
        firstName: task.createdBy.firstName,
        lastName: task.createdBy.lastName,
      },
      timestamp: new Date(),
    });
    await invalidateTaskCaches(task.id, projectId);
    return task;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to create task', 500);
  }
};

// Update task
export const updateTask = async (
  taskId: string,
  taskData: UpdateTaskInput
): Promise<TaskResponse> => {
  try {
    // Handle status change to DONE
    const updateData = { ...taskData };

    // Just for knowlage here is a very intersting thing that i found about ts
    /* 
      1- In the first if we have taskData.status === 'DONE'
      2- So ts know's if the first con is not true then taskData.status is not 'DONE'
      3- What happend is typeScript narrows the enum and remove 'DONE' from the status
      4- So in the second if taskData.status can be only ("TODO" | "IN_PROGRESS" | "IN_REVIEW" | "CANCELLED" | undefined) 
    */
    if (taskData.status === 'DONE' && taskData.status !== undefined) {
      updateData.completedAt = new Date();
    } else if (taskData.status) {
      updateData.completedAt = null;
    }

    if (taskData.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: taskData.assigneeId, isActive: true },
      });

      if (!assignee) {
        throw new ApiError('Assignee not found or inactive', 400);
      }
    }
    // For realTime comparason
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    const changes = [];
    if (taskData.status && currentTask?.status !== taskData.status) {
      changes.push({
        field: 'status',
        oldValue: currentTask?.status || null,
        newValue: taskData.status,
      });
    }
    if (taskData.priority && currentTask?.priority !== taskData.priority) {
      changes.push({
        field: 'priority',
        oldValue: currentTask?.priority || null,
        newValue: taskData.priority,
      });
    }

    emitTaskUpdate({
      taskId,
      projectId: task.project.id,
      updatedBy: {
        id: task.createdBy.id,
        email: task.createdBy.email,
        username: task.createdBy.username,
        firstName: task.createdBy.firstName,
        lastName: task.createdBy.lastName,
      },
      changes,
      timestamp: new Date(),
    });

    await invalidateTaskCaches(taskId, task.project.id);
    return task;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update task', 500);
  }
};

// Delete task
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        createdBy: true,
      },
    });
    if (!task) {
      return;
    }
    await invalidateTaskCaches(taskId, task.project.id);
    await prisma.task.delete({
      where: { id: taskId },
    });
    if (task) {
      emitTaskDeleted({
        taskId,
        projectId: task.project.id,
        deletedBy: {
          id: task.createdBy.id,
          email: task.createdBy.email,
          username: task.createdBy.username,
          firstName: task.createdBy.firstName,
          lastName: task.createdBy.lastName,
        },
        timestamp: new Date(),
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new ApiError('Task not found', 404);
      }
    }
    throw new ApiError('Failed to delete task', 500);
  }
};

// Get user's assigned tasks
export const getUserTasks = async (
  userId: string,
  options: PaginationOptions
): Promise<{ tasks: TaskResponse[]; total: number }> => {
  try {
    const skip = calculateSkip(options.page, options.limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { assigneeId: userId },
        skip,
        take: options.limit,
        orderBy: {
          [options.sortBy || 'createdAt']: options.sortOrder || 'desc',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
      }),
      prisma.task.count({ where: { assigneeId: userId } }),
    ]);

    return { tasks, total };
  } catch {
    throw new ApiError('Failed to fetch user tasks', 500);
  }
};
