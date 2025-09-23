import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { forbiddenResponse, notFoundResponse } from '../utils/response.util';
import { AuthenticatedRequest } from './auth.middleware';

// Extend Request to include project data Req(User, Project)
interface ProjectRequestBody extends AuthenticatedRequest {
  project?: {
    id: string;
    name: string;
    ownerId: string;
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  };
}

// Check if user has access to project and attach project data to request
export const requireProjectAccess = (
  requiredRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
) => {
  return async (
    req: ProjectRequestBody,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        forbiddenResponse(res, 'Authentication required');
        return;
      }

      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        notFoundResponse(res, 'Project ID is required');
        return;
      }

      // Find project and user's membership
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            where: { userId: req.user.id },
            select: { role: true },
          },
        },
      });

      if (!project) {
        notFoundResponse(res, 'Project not found');
        return;
      }

      if (project.isArchived) {
        forbiddenResponse(res, 'Project is archived');
        return;
      }

      // Check if user is owner or member
      let userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null = null;

      if (project.ownerId === req.user.id) {
        userRole = 'OWNER';
      } else if (project.members.length > 0) {
        userRole = project.members[0].role;
      }

      if (!userRole) {
        forbiddenResponse(res, 'You do not have access to this project');
        return;
      }

      // Check role hierarchy if required role is specified
      if (requiredRole) {
        const roleHierarchy = {
          VIEWER: 0,
          MEMBER: 1,
          ADMIN: 2,
          OWNER: 3,
        };

        if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
          forbiddenResponse(res, `${requiredRole} role or higher required`);
          return;
        }
      }

      // Attach project data to request
      req.project = {
        id: project.id,
        name: project.name,
        ownerId: project.ownerId,
        userRole,
      };

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      forbiddenResponse(res, 'Permission check failed');
      return;
    }
  };
};

// Check if user can manage project (OWNER or ADMIN)
export const requireProjectManagement = requireProjectAccess('ADMIN');

// Check if user is project owner
export const requireProjectOwnership = requireProjectAccess('OWNER');

// Check if user can edit tasks (OWNER, ADMIN, or MEMBER)
export const requireTaskEdit = requireProjectAccess('MEMBER');

// Check task ownership or project management permissions
export const requireTaskAccess = async (
  req: ProjectRequestBody,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      forbiddenResponse(res, 'Authentication required');
      return;
    }

    const taskId = req.params.taskId || req.params.id;

    if (!taskId) {
      notFoundResponse(res, 'Task ID is required');
      return;
    }

    // Find task with project info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: req.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!task) {
      notFoundResponse(res, 'Task not found');
      return;
    }

    // Check if user is task creator, assignee, or has project access
    const isTaskCreator = task.createdById === req.user.id;
    const isAssignee = task.assigneeId === req.user.id;
    const isProjectOwner = task.project.ownerId === req.user.id;
    const hasProjectAccess = task.project.members.length > 0;

    if (!isTaskCreator && !isAssignee && !isProjectOwner && !hasProjectAccess) {
      forbiddenResponse(res, 'You do not have access to this task');
      return;
    }

    // Attach project data to request (similar to requireProjectAccess)
    let userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null = null;

    if (isProjectOwner) {
      userRole = 'OWNER';
    } else if (hasProjectAccess) {
      userRole = task.project.members[0].role;
    }

    req.project = {
      id: task.project.id,
      name: task.project.name,
      ownerId: task.project.ownerId,
      userRole: userRole || 'VIEWER',
    };

    next();
  } catch (error) {
    console.error('Task access check error:', error);
    forbiddenResponse(res, 'Access check failed');
    return;
  }
};
