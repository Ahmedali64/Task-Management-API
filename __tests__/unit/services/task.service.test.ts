import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from '../../../src/services/task.service';
import { TestDataFactory, testDb } from '../../setup';
import { ApiError } from '../../../src/middleware/errorHandler.middleware';

// Define proper types for test data
interface TestUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface TestProject {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  ownerId: string;
  owner: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    tasks: number;
    members: number;
  };
}

interface TestTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  createdById: string;
  assigneeId: string | null;
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
  } | null;
  createdBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

describe('Task Service', () => {
  let testUser: TestUser;
  let testProject: TestProject;

  beforeEach(async () => {
    // Create test user and project for each test
    testUser = await TestDataFactory.createUser();
    testProject = await TestDataFactory.createProject(testUser.id);
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO' as const,
        priority: 'HIGH' as const,
        dueDate: new Date(),
        assigneeId: testUser.id,
      };

      const task = await createTask(testProject.id, testUser.id, taskData);

      expect(task).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(taskData.status);
      expect(task.priority).toBe(taskData.priority);
      expect(task.project.id).toBe(testProject.id);
      expect(task.createdBy.id).toBe(testUser.id);
      expect(task.assignee?.id).toBe(testUser.id);
    });

    it('should create task without assignee', async () => {
      const taskData = {
        title: 'Unassigned Task',
        description: 'No assignee',
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        dueDate: null,
        assigneeId: null,
      };

      const task = await createTask(testProject.id, testUser.id, taskData);

      expect(task.assignee).toBeNull();
    });

    it('should throw error for inactive assignee', async () => {
      // Create inactive user
      const inactiveUser = await TestDataFactory.createUser({
        isActive: false,
      });

      const taskData = {
        title: 'Test Task',
        status: 'TODO' as const,
        priority: 'LOW' as const,
        assigneeId: inactiveUser.id,
      };

      await expect(
        createTask(testProject.id, testUser.id, taskData)
      ).rejects.toThrow(ApiError);
    });

    it('should throw error when assignee has no project access', async () => {
      // Create user not in project
      const otherUser = await TestDataFactory.createUser();

      const taskData = {
        title: 'Test Task',
        status: 'TODO' as const,
        priority: 'LOW' as const,
        assigneeId: otherUser.id,
      };

      await expect(
        createTask(testProject.id, testUser.id, taskData)
      ).rejects.toThrow('Assignee does not have access to this project');
    });
  });

  describe('getTasks', () => {
    it('should return tasks for project owner', async () => {
      // Create test tasks
      await TestDataFactory.createTask(testProject.id, testUser.id);
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        title: 'Task 2',
      });

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      const result = await getTasks(testUser.id, {}, options);

      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.tasks[0].project.id).toBe(testProject.id);
    });

    it('should filter tasks by status', async () => {
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        status: 'TODO',
      });
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        status: 'DONE',
      });

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      const result = await getTasks(testUser.id, { status: 'TODO' }, options);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].status).toBe('TODO');
    });

    it('should filter tasks by priority', async () => {
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        priority: 'HIGH',
      });
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        priority: 'LOW',
      });

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      const result = await getTasks(testUser.id, { priority: 'HIGH' }, options);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].priority).toBe('HIGH');
    });

    it('should search tasks by title and description', async () => {
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        title: 'Frontend Development',
        description: 'React components',
      });
      await TestDataFactory.createTask(testProject.id, testUser.id, {
        title: 'Backend API',
        description: 'Node.js service',
      });

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      const result = await getTasks(testUser.id, { search: 'React' }, options);

      expect(result.tasks).toHaveLength(1);
      if (result.tasks[0].description) {
        expect(result.tasks[0].description).toContain('React');
      }
    });
  });

  describe('updateTask', () => {
    let testTask: TestTask;

    beforeEach(async () => {
      testTask = await TestDataFactory.createTask(testProject.id, testUser.id);
    });

    it('should update task status', async () => {
      const updateData = { status: 'IN_PROGRESS' as const };

      const updatedTask = await updateTask(testTask.id, updateData);

      expect(updatedTask.status).toBe('IN_PROGRESS');
      expect(updatedTask.completedAt).toBeNull();
    });

    it('should set completedAt when status changes to DONE', async () => {
      const updateData = { status: 'DONE' as const };

      const updatedTask = await updateTask(testTask.id, updateData);

      expect(updatedTask.status).toBe('DONE');
      expect(updatedTask.completedAt).toBeDefined();
      expect(updatedTask.completedAt).toBeInstanceOf(Date);
    });

    it('should update multiple fields', async () => {
      const updateData = {
        title: 'Updated Title',
        priority: 'URGENT' as const,
        description: 'Updated description',
      };

      const updatedTask = await updateTask(testTask.id, updateData);

      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.priority).toBe('URGENT');
      expect(updatedTask.description).toBe('Updated description');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const testTask = await TestDataFactory.createTask(
        testProject.id,
        testUser.id
      );

      await deleteTask(testTask.id);

      // Verify task is deleted
      const deletedTask = await testDb.task.findUnique({
        where: { id: testTask.id },
      });
      expect(deletedTask).toBeNull();
    });
  });
});
