import prisma from '../config/database';
import { Prisma } from '../generated/prisma';
import { ApiError } from '../middleware/errorHandler.middleware';
import { emitMemberAdded, EventUser } from '../sockets/taskEvents';
import { calculateSkip, PaginationOptions } from '../utils/pagination.util';
import {
  AddProjectMemberInput,
  CreateProjectInput,
  UpdateMemberRoleInput,
  UpdateProjectInput,
} from '../utils/validation.util';
import {
  cacheUserProject,
  cacheUserProjects,
  getCachedUserProjects,
  invalidateProjectCaches,
  invalidateUserCaches,
} from './cache.service';

// Project response interface
interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  members: {
    id: string;
    role: string;
    joinedAt: Date;
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
    };
  }[];
  _count: {
    tasks: number;
    members: number;
  };
}

// Project member response
interface ProjectMemberResponse {
  id: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

// Get user's projects with pagination
export const getUserProjects = async (
  userId: string,
  options: PaginationOptions
): Promise<{ projects: ProjectResponse[]; total: number }> => {
  try {
    const cachedResult = await getCachedUserProjects<{
      projects: ProjectResponse[];
      total: number;
    }>(userId);
    if (cachedResult) {
      console.log(`Projects served from cache for user: ${userId}`);
      return cachedResult;
    }
    const skip = calculateSkip(options.page, options.limit);

    // Where con for projects
    const whereClause = {
      OR: [
        { ownerId: userId },
        {
          members: {
            some: { userId },
          },
        },
      ],
      isArchived: false,
    };

    const [projects, total] = await Promise.all([
      // Return projects
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: options.limit,
        orderBy: {
          [options.sortBy || 'createdAt']: options.sortOrder || 'desc',
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          members: {
            select: {
              id: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      }),
      // Return count
      prisma.project.count({ where: whereClause }),
    ]);

    // Cache the result for 15 minutes
    await cacheUserProjects(userId, { projects, total });
    console.log(`Projects cached for user: ${userId}`);
    return { projects, total };
  } catch {
    throw new ApiError('Failed to fetch projects', 500);
  }
};

// Get project by ID with detailed information
export const getProjectById = async (
  projectId: string,
  userId: string
): Promise<ProjectResponse> => {
  try {
    const cachedResult =
      await getCachedUserProjects<Promise<ProjectResponse>>(userId);
    if (cachedResult) {
      console.log(`Projects served from cache for user: ${userId}`);
      return cachedResult;
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // OWNER first, then ADMIN, MEMBER, VIEWER
            { joinedAt: 'asc' },
          ],
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      throw new ApiError('Project not found', 404);
    }

    // If userId = ownerId or userId is in the members list
    const hasAccess =
      project.ownerId === userId ||
      project.members.some((member) => member.user.id === userId);

    if (!hasAccess) {
      throw new ApiError('You do not have access to this project', 403);
    }
    await cacheUserProject(userId, project);
    return project;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch project', 500);
  }
};

// Create new project
export const createProject = async (
  userId: string,
  projectData: CreateProjectInput
): Promise<ProjectResponse> => {
  try {
    const project = await prisma.project.create({
      data: {
        ...projectData,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    // Ivalidate any saved cashed data saved by getUserProjects
    await invalidateUserCaches(userId);
    return project;
  } catch {
    throw new ApiError('Failed to create project', 500);
  }
};

// Update project
export const updateProject = async (
  projectId: string,
  projectData: UpdateProjectInput
): Promise<ProjectResponse> => {
  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...projectData,
        updatedAt: new Date(),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    // Invalidate caches for project owner and all members
    await Promise.all([
      invalidateUserCaches(project.ownerId),
      ...project.members.map((member) => invalidateUserCaches(member.user.id)),
    ]);

    return project;
  } catch {
    throw new ApiError('Failed to update project', 500);
  }
};

// Delete project (only owner can delete)
// We did not check here cause we have a middleware that will make sure that owner only can access this route
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    // Get project with members before deletion
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          select: { user: { select: { id: true } } },
        },
      },
    });
    // Delete project (cascade will handle related data)
    await prisma.project.delete({
      where: { id: projectId },
    });

    if (project) {
      await Promise.all([
        invalidateUserCaches(project.ownerId),
        ...project.members.map((member) =>
          invalidateUserCaches(member.user.id)
        ),
        invalidateProjectCaches(projectId),
      ]);
    }
  } catch {
    throw new ApiError('Failed to delete project', 500);
  }
};

// Add member to project
export const addProjectMember = async (
  projectId: string,
  memberData: AddProjectMemberInput,
  addedBy: EventUser
): Promise<ProjectMemberResponse> => {
  try {
    const { userId, role } = memberData;

    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new ApiError('User not found or inactive', 404);
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        // This come from the unique field that we have made
        // Where userId is unique per project
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (existingMember) {
      throw new ApiError('User is already a member of this project', 400);
    }

    const newMember = await prisma.projectMember.create({
      data: {
        userId,
        projectId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    emitMemberAdded({
      projectId,
      newMember: {
        id: newMember.id,
        role: newMember.role,
        user: {
          id: newMember.user.id,
          email: newMember.user.email,
          username: newMember.user.username,
          firstName: newMember.user.firstName,
          lastName: newMember.user.lastName,
        },
      },
      addedBy,
      timestamp: new Date(),
    });
    await Promise.all([
      invalidateUserCaches(userId),
      addedBy ? invalidateUserCaches(addedBy.id) : Promise.resolve(),
    ]);
    return newMember;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to add project member', 500);
  }
};

// Update member role
export const updateMemberRole = async (
  projectId: string,
  userId: string,
  roleData: UpdateMemberRoleInput
): Promise<ProjectMemberResponse> => {
  try {
    const updatedMember = await prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: { role: roleData.role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Invalidate cache for the affected user
    await invalidateUserCaches(userId);

    return updatedMember;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new ApiError('Project member not found', 404);
      }
    }
    throw new ApiError('Failed to update member role', 500);
  }
};

// Remove member from project
export const removeProjectMember = async (
  projectId: string,
  userId: string
): Promise<void> => {
  try {
    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    // Invalidate cache for the removed user
    await invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new ApiError('Project member not found', 404);
      }
    }
    throw new ApiError('Failed to remove project member', 500);
  }
};
