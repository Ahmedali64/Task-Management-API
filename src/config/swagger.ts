import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API Documentation',
      version: '1.0.0',
      description:
        'A comprehensive task management API with team collaboration, real-time updates, and caching',
      contact: {
        name: 'API Support',
        email: 'ex-email@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login/register endpoint',
        },
      },
      schemas: {
        // ==================== Error Schemas ====================
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        DetailedError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error message',
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // ==================== Entity Schemas ====================
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            username: {
              type: 'string',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            avatar: {
              type: 'string',
              nullable: true,
            },
            bio: {
              type: 'string',
              nullable: true,
            },
            emailVerified: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            color: {
              type: 'string',
              nullable: true,
            },
            isArchived: {
              type: 'boolean',
            },
            owner: {
              $ref: '#/components/schemas/User',
            },
            members: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProjectMember',
              },
            },
            _count: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'integer',
                },
                members: {
                  type: 'integer',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'DONE', 'IN_REVIEW', 'CANCELLED'],
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            project: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                color: { type: 'string', nullable: true },
              },
            },
            assignee: {
              $ref: '#/components/schemas/User',
              nullable: true,
            },
            createdBy: {
              $ref: '#/components/schemas/User',
            },
          },
        },

        ProjectMember: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            role: {
              type: 'string',
              enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
            },
            joinedAt: {
              type: 'string',
              format: 'date-time',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },

        Comment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            content: {
              type: 'string',
              example: 'This is a comment on the task',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            taskId: {
              type: 'string',
              format: 'uuid',
            },
          },
        },

        // ==================== Response Wrappers ====================
        CommentResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Comment retrieved successfully',
            },
            data: {
              $ref: '#/components/schemas/Comment',
            },
          },
        },

        ProjectResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Project retrieved successfully',
            },
            data: {
              $ref: '#/components/schemas/Project',
            },
          },
        },

        TaskResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Task retrieved successfully',
            },
            data: {
              $ref: '#/components/schemas/Task',
            },
          },
        },

        // ==================== Pagination ====================
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 10,
            },
          },
        },

        PaginatedTasksResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Task',
              },
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
        },

        PaginatedProjectsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Project',
              },
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
        },

        PaginatedCommentsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Comment',
              },
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Projects',
        description: 'Project management and team collaboration',
      },
      {
        name: 'Tasks',
        description: 'Task management operations',
      },
      {
        name: 'Comments',
        description: 'Task comments and discussions',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to API routes with JSDoc comments
};

export const swaggerSpec = swaggerJsdoc(options);
