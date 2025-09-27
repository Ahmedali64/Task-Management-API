import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler.middleware';
import { calculateSkip, PaginationOptions } from '../utils/pagination.util';
import {
  emitNewComment,
  emitCommentUpdate,
  emitCommentDelete,
} from '../sockets/taskEvents';
import { getTaskById } from './task.service';
import { getUserProfile } from './auth.service';
interface CommentResponse {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

interface CreateCommentInput {
  content: string;
}

interface UpdateCommentInput {
  content: string;
}

// Get comments for a task with pagination
export const getTaskComments = async (
  taskId: string,
  options: PaginationOptions
): Promise<{ comments: CommentResponse[]; total: number }> => {
  try {
    const skip = calculateSkip(options.page, options.limit);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { taskId },
        skip,
        take: options.limit,
        orderBy: { createdAt: options.sortOrder || 'desc' },
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
      }),
      prisma.comment.count({ where: { taskId } }),
    ]);

    return { comments, total };
  } catch {
    throw new ApiError('Failed to fetch comments', 500);
  }
};

// Create a new comment on a task
export const createComment = async (
  taskId: string,
  userId: string,
  commentData: CreateCommentInput
): Promise<CommentResponse> => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              where: { userId },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new ApiError('Task not found', 404);
    }

    const hasAccess =
      task.project.ownerId === userId ||
      task.project.members.length > 0 ||
      task.createdById === userId ||
      task.assigneeId === userId;

    if (!hasAccess) {
      throw new ApiError(
        'You do not have permission to comment on this task',
        403
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: commentData.content.trim(),
        taskId,
        userId,
      },
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

    emitNewComment({
      commentId: comment.id,
      taskId,
      projectId: task.project.id,
      author: {
        id: comment.user.id,
        username: comment.user.username,
        firstName: comment.user.firstName,
        lastName: comment.user.lastName,
        avatar: comment.user.avatar,
      },
      content: comment.content,
      timestamp: comment.createdAt,
    });

    return comment;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to create comment', 500);
  }
};

// Update a comment
export const updateComment = async (
  commentId: string,
  userId: string,
  commentData: UpdateCommentInput
): Promise<CommentResponse> => {
  try {
    // Check if comment exists and user is the author
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      throw new ApiError('Comment not found', 404);
    }

    if (existingComment.userId !== userId) {
      throw new ApiError('You can only edit your own comments', 403);
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: commentData.content.trim(),
        updatedAt: new Date(),
      },
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
    const task = await getTaskById(comment.taskId);
    emitCommentUpdate({
      commentId: comment.id,
      taskId: comment.taskId,
      projectId: task.project.id,
      author: {
        id: comment.user.id,
        username: comment.user.username,
        firstName: comment.user.firstName,
        lastName: comment.user.lastName,
        avatar: comment.user.avatar,
      },
      content: comment.content,
      timestamp: comment.updatedAt,
    });
    return comment;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update comment', 500);
  }
};

// Delete a comment
export const deleteComment = async (
  commentId: string,
  userId: string
): Promise<void> => {
  try {
    // Get comment with task and project info
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!comment) {
      throw new ApiError('Comment not found', 404);
    }

    // Check if user can delete (comment author or project owner)
    const canDelete =
      comment.userId === userId || comment.task.project.ownerId === userId;

    if (!canDelete) {
      throw new ApiError(
        'You can only delete your own comments or comments in projects you own',
        403
      );
    }
    const user = await getUserProfile(comment.userId);
    const deleteCommentUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const deletionData = {
      commentId: comment.id,
      taskId: comment.taskId,
      projectId: comment.task.project.id,
    };

    await prisma.comment.delete({
      where: { id: commentId },
    });

    emitCommentDelete({
      commentId: deletionData.commentId,
      taskId: deletionData.taskId,
      projectId: deletionData.projectId,
      deletedBy: deleteCommentUser,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to delete comment', 500);
  }
};

// Get a single comment by ID
export const getCommentById = async (
  commentId: string
): Promise<CommentResponse> => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new ApiError('Comment not found', 404);
    }

    return comment;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch comment', 500);
  }
};
