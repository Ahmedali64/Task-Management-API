import { PrismaClient } from '../src/generated/prisma';
import { hashPassword } from '../src/utils/password.util';

// Create test database client
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL + '_test',
    },
  },
});

// Mock Redis for testing
jest.mock('../src/config/redis', () => ({
  __esModule: true,
  default: {
    isOpen: true,
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    setEx: jest.fn().mockResolvedValue('OK'),
  },
  connectRedis: jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock Socket.io events
jest.mock('../src/sockets/taskEvents', () => ({
  emitTaskCreated: jest.fn(),
  emitTaskUpdate: jest.fn(),
  emitTaskDeleted: jest.fn(),
  emitNewComment: jest.fn(),
  emitCommentUpdate: jest.fn(),
  emitCommentDelete: jest.fn(),
  emitMemberAdded: jest.fn(),
}));

// Mock email service
jest.mock('../src/services/email.service', () => ({
  sendEmailVerification: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true),
  generateSecureToken: jest.fn().mockReturnValue('mock-token-123'),
}));

// Test data factory
export class TestDataFactory {
  // User
  static async createUser(overrides: Partial<any> = {}) {
    const defaultUser = {
      email: `test${Date.now()}@example.com`,
      username: `user${Date.now()}`,
      firstName: 'Test',
      lastName: 'User',
      password: await hashPassword('Test123!@#'),
      ...overrides,
    };

    return testDb.user.create({
      data: defaultUser,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
  }
  // Project
  static async createProject(userId: string, overrides: Partial<any> = {}) {
    const defaultProject = {
      name: `Test Project ${Date.now()}`,
      description: 'Test project description',
      color: '#4f46e5',
      ownerId: userId,
      ...overrides,
    };

    return testDb.project.create({
      data: defaultProject,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
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
  }
  // Task
  static async createTask(
    projectId: string,
    createdById: string,
    overrides: Partial<any> = {}
  ) {
    const defaultTask = {
      title: `Test Task ${Date.now()}`,
      description: 'Test task description',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      projectId,
      createdById,
      ...overrides,
    };

    return testDb.task.create({
      data: defaultTask,
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
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
  // Comment
  static async createComment(
    taskId: string,
    userId: string,
    overrides: Partial<any> = {}
  ) {
    const defaultComment = {
      content: `Test comment ${Date.now()}`,
      taskId,
      userId,
      ...overrides,
    };

    return testDb.comment.create({
      data: defaultComment,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}

// Cleanup function
export const cleanupDatabase = async () => {
  // Delete in order to avoid foreign key constraints
  await testDb.comment.deleteMany();
  await testDb.task.deleteMany();
  await testDb.projectMember.deleteMany();
  await testDb.project.deleteMany();
  await testDb.refreshToken.deleteMany();
  await testDb.emailVerificationToken.deleteMany();
  await testDb.passwordResetToken.deleteMany();
  await testDb.user.deleteMany();
};

// Setup before all tests
beforeAll(async () => {
  await testDb.$connect();
  // This will create tables if they don't exist
  try {
    await testDb.$executeRaw`SELECT 1`; // Test connection
    console.log('Test database connected and ready');
  } catch (error) {
    console.error('Test database setup failed:', error);
  }
});

// Cleanup after each test
afterEach(async () => {
  await cleanupDatabase();
});

// Cleanup after all tests
afterAll(async () => {
  await cleanupDatabase();
  await testDb.$disconnect();
});
