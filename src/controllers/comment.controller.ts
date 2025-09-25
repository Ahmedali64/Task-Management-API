import expressAsyncHandler from 'express-async-handler';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Response } from 'express';
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
  getCommentById,
} from '../services/comment.service';
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

// Comment body interface
interface CommentBody {
  content: string;
}

interface AuthenticatedRequestWithCommentBody extends AuthenticatedRequest {
  body: CommentBody;
}

// Get comments for a task
export const getComments = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<
      { taskId: string }, // Param
      object,
      object,
      CreatePaginationOptionsInterface
    >,
    res: Response
  ) => {
    const paginationOptions = createPaginationOptions(req.query);
    const { comments, total } = await getTaskComments(
      req.params.taskId,
      paginationOptions
    );

    const paginationMeta = createPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );

    paginatedResponse(
      res,
      comments,
      paginationMeta,
      'Comments retrieved successfully'
    );
  }
);

// Create a new comment
export const createNewComment = expressAsyncHandler(
  async (req: AuthenticatedRequestWithCommentBody, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    const comment = await createComment(
      req.params.taskId,
      req.user.id,
      req.body
    );

    createdResponse(res, comment, 'Comment created successfully');
  }
);

// Get a specific comment
export const getComment = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await getCommentById(req.params.id);
    successResponse(res, comment, 'Comment retrieved successfully');
  }
);

// Update a comment
export const updateCommentById = expressAsyncHandler(
  async (req: AuthenticatedRequestWithCommentBody, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    const comment = await updateComment(req.params.id, req.user.id, req.body);
    successResponse(res, comment, 'Comment updated successfully');
  }
);

// Delete a comment
export const deleteCommentById = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    await deleteComment(req.params.id, req.user.id);
    successResponse(res, null, 'Comment deleted successfully');
  }
);
