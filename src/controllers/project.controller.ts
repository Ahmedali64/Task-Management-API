import expressAsyncHandler from 'express-async-handler';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  createPaginationMeta,
  createPaginationOptions,
} from '../utils/pagination.util';
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProjectById,
  getUserProjects,
  removeProjectMember,
  updateMemberRole,
  updateProject,
} from '../services/project.service';
import {
  createdResponse,
  paginatedResponse,
  successResponse,
} from '../utils/response.util';
import { ProjectRole } from '../generated/prisma';

type QueryParams = {
  page: string;
  limit: string;
};

interface AuthenticatedRequestWithProjectBody extends AuthenticatedRequest {
  body: {
    name: string;
    description: string;
    color: string;
  };
}

interface AuthenticatedRequestWithProjectMemberBody
  extends AuthenticatedRequest {
  body: {
    userId: string;
    role: ProjectRole;
  };
}

type ProjectRoleWithoutOwner = 'ADMIN' | 'MEMBER' | 'VIEWER';

interface AuthenticatedRequestWithProjectMemberBodyWithoutOwner
  extends AuthenticatedRequest {
  body: {
    userId: string;
    role: ProjectRoleWithoutOwner;
  };
}

// Get user's projects
export const getProjects = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, object, QueryParams>,
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
    const { projects, total } = await getUserProjects(
      req.user.id,
      paginationOptions
    );

    const paginationMeta = createPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );
    paginatedResponse(
      res,
      projects,
      paginationMeta,
      'Projects retrieved successfully'
    );
  }
);

// Get project by ID
export const getProject = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    const project = await getProjectById(req.params.id, req.user.id);

    successResponse(res, project, 'Project retrieved successfully');
  }
);

// Create new project
export const createNewProject = expressAsyncHandler(
  async (req: AuthenticatedRequestWithProjectBody, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    const project = await createProject(req.user.id, req.body);

    createdResponse(res, project, 'Project created successfully');
  }
);

// Update project
export const updateProjectById = expressAsyncHandler(
  async (req: AuthenticatedRequestWithProjectBody, res: Response) => {
    const project = await updateProject(req.params.id, req.body);

    successResponse(res, project, 'Project updated successfully');
  }
);

// Delete project
export const deleteProjectById = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    await deleteProject(req.params.id);

    successResponse(res, null, 'Project deleted successfully');
  }
);

// Add member to project
export const addMember = expressAsyncHandler(
  async (req: AuthenticatedRequestWithProjectMemberBody, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    const addedBy = {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };
    const member = await addProjectMember(req.params.id, req.body, addedBy);

    createdResponse(res, member, 'Member added to project successfully');
  }
);

// Update member role
export const updateMember = expressAsyncHandler(
  async (
    req: AuthenticatedRequestWithProjectMemberBodyWithoutOwner,
    res: Response
  ) => {
    const member = await updateMemberRole(
      req.params.id,
      req.params.userId,
      req.body
    );

    successResponse(res, member, 'Member role updated successfully');
  }
);

// Remove member from project
export const removeMember = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    await removeProjectMember(req.params.id, req.params.userId);

    successResponse(res, null, 'Member removed from project successfully');
  }
);
