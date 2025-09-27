import { getSocketInstance } from './index';

export interface EventUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface TaskUpdateData {
  taskId: string;
  projectId: string;
  updatedBy: EventUser;
  changes: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[];
  timestamp: Date;
}

interface CommentData {
  commentId: string;
  taskId: string;
  projectId: string;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  content: string;
  timestamp: Date;
}

interface TaskAssignmentData {
  taskId: string;
  projectId: string;
  taskTitle: string;
  assignedBy: EventUser;
  assignedTo: EventUser | null;
  timestamp: Date;
}

interface TaskCreationData {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId: string | null;
  };
  projectId: string;
  createdBy: EventUser;
  timestamp: Date;
}

interface TaskDeletionData {
  taskId: string;
  projectId: string;
  deletedBy: EventUser;
  timestamp: Date;
}

interface MemberData {
  projectId: string;
  newMember: {
    id: string;
    role: string;
    user: EventUser;
  };
  addedBy: EventUser;
  timestamp: Date;
}

// Emit task status update to project members
export const emitTaskUpdate = (data: TaskUpdateData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to all users in the project room
    io.to(`project:${data.projectId}`).emit('task_updated', data);

    // If task is assigned to someone, also notify them directly
    const assigneeChange = data.changes.find(
      (change) => change.field === 'assigneeId'
    );
    // newValue here is the userId
    if (assigneeChange && assigneeChange.newValue) {
      io.to(`user:${assigneeChange.newValue}`).emit('task_assigned_to_you', {
        taskId: data.taskId,
        projectId: data.projectId,
        assignedBy: data.updatedBy,
        timestamp: data.timestamp,
      });
    }

    console.log(
      `Task update emitted for task ${data.taskId} in project ${data.projectId}`
    );
  } catch (error) {
    console.error('Error emitting task update:', error);
  }
};

// Emit new comment to project members
export const emitNewComment = (data: CommentData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to all users in the project room
    io.to(`project:${data.projectId}`).emit('new_comment', data);

    console.log(
      `New comment emitted for task ${data.taskId} in project ${data.projectId}`
    );
  } catch (error) {
    console.error('Error emitting new comment:', error);
  }
};

// Emit comment update to project members
export const emitCommentUpdate = (data: CommentData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to all users in the project room
    io.to(`project:${data.projectId}`).emit('comment_updated', data);

    console.log(
      `Comment update emitted for task ${data.taskId} in project ${data.projectId}`
    );
  } catch (error) {
    console.error('Error emitting comment update:', error);
  }
};

// Emit comment deletion to project members
export const emitCommentDelete = (data: {
  commentId: string;
  taskId: string;
  projectId: string;
  deletedBy: EventUser;
}): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to all users in the project room
    io.to(`project:${data.projectId}`).emit('comment_deleted', {
      commentId: data.commentId,
      taskId: data.taskId,
      deletedBy: data.deletedBy,
      timestamp: new Date(),
    });

    console.log(
      `Comment deletion emitted for task ${data.taskId} in project ${data.projectId}`
    );
  } catch (error) {
    console.error('Error emitting comment deletion:', error);
  }
};

// Emit task assignment change
export const emitTaskAssignment = (data: TaskAssignmentData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to project room
    io.to(`project:${data.projectId}`).emit('task_assignment_changed', data);

    // If assigned to someone, notify them directly
    if (data.assignedTo) {
      io.to(`user:${data.assignedTo.id}`).emit('task_assigned_to_you', {
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        projectId: data.projectId,
        assignedBy: data.assignedBy,
        timestamp: data.timestamp,
      });
    }

    console.log(`Task assignment emitted for task ${data.taskId}`);
  } catch (error) {
    console.error('Error emitting task assignment:', error);
  }
};

// Emit task creation to project members
export const emitTaskCreated = (data: TaskCreationData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to all users in the project room
    io.to(`project:${data.projectId}`).emit('task_created', data);

    console.log(`Task creation emitted for project ${data.projectId}`);
  } catch (error) {
    console.error('Error emitting task creation:', error);
  }
};

// Emit task deletion to project members
export const emitTaskDeleted = (data: TaskDeletionData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to all users in the project room
    io.to(`project:${data.projectId}`).emit('task_deleted', data);

    console.log(`Task deletion emitted for project ${data.projectId}`);
  } catch (error) {
    console.error('Error emitting task deletion:', error);
  }
};

// Emit project member added
export const emitMemberAdded = (data: MemberData): void => {
  try {
    const io = getSocketInstance();
    if (!io) return;

    // Emit to project room
    io.to(`project:${data.projectId}`).emit('member_added', data);

    // Notify the new member directly
    io.to(`user:${data.newMember.user.id}`).emit('added_to_project', {
      projectId: data.projectId,
      addedBy: data.addedBy,
      role: data.newMember.role,
      timestamp: new Date(),
    });

    console.log(`Member addition emitted for project ${data.projectId}`);
  } catch (error) {
    console.error('Error emitting member addition:', error);
  }
};
