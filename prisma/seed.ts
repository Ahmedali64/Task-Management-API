import {
  PrismaClient,
  TaskStatus,
  TaskPriority,
  ProjectRole,
} from '../src/generated/prisma';
//password: 'Password@123',
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data (This is just for development)
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing data!');

  // Create Users Demo Data
  const john = await prisma.user.create({
    data: {
      email: 'john@example.com',
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Full-stack developer passionate about clean code',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    },
  });

  const jane = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      username: 'jane_smith',
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'UI/UX Designer with 5+ years experience',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
    },
  });

  const mike = await prisma.user.create({
    data: {
      email: 'mike@example.com',
      username: 'mike_wilson',
      firstName: 'Mike',
      lastName: 'Wilson',
      bio: 'Project manager and agile enthusiast',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
    },
  });

  console.log('Created users:', {
    john: john.username,
    jane: jane.username,
    mike: mike.username,
  });

  // Create Projects
  const webProject = await prisma.project.create({
    data: {
      name: 'E-commerce Website',
      description:
        'Building a modern e-commerce platform with React and Node.js',
      color: '#3b82f6', // Blue
      ownerId: john.id,
    },
  });

  const mobileProject = await prisma.project.create({
    data: {
      name: 'Mobile Task App',
      description: 'Cross-platform mobile app for task management',
      color: '#10b981', // Green
      ownerId: jane.id,
    },
  });

  console.log('Created projects:', {
    web: webProject.name,
    mobile: mobileProject.name,
  });

  // Add Project Members
  await prisma.projectMember.createMany({
    data: [
      // John's project members
      { userId: jane.id, projectId: webProject.id, role: ProjectRole.ADMIN },
      { userId: mike.id, projectId: webProject.id, role: ProjectRole.MEMBER },

      // Jane's project members
      {
        userId: john.id,
        projectId: mobileProject.id,
        role: ProjectRole.MEMBER,
      },
      { userId: mike.id, projectId: mobileProject.id, role: ProjectRole.ADMIN },
    ],
  });

  console.log('Added project members');

  // Create Tasks
  const tasks = await prisma.task.createMany({
    data: [
      // Web project tasks
      {
        title: 'Set up project structure',
        description:
          'Initialize React app with TypeScript and configure build tools',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        projectId: webProject.id,
        createdById: john.id,
        assigneeId: john.id,
        completedAt: new Date('2024-01-15'),
      },
      {
        title: 'Design user authentication',
        description: 'Create login, register, and password reset flows',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        projectId: webProject.id,
        createdById: john.id,
        assigneeId: jane.id,
        dueDate: new Date('2024-02-01'),
      },
      {
        title: 'Implement shopping cart',
        description:
          'Build cart functionality with add, remove, and update quantities',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        projectId: webProject.id,
        createdById: mike.id,
        assigneeId: john.id,
        dueDate: new Date('2024-02-15'),
      },
      {
        title: 'Payment integration',
        description: 'Integrate Stripe for secure payment processing',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        projectId: webProject.id,
        createdById: john.id,
        dueDate: new Date('2024-02-20'),
      },

      // Mobile project tasks
      {
        title: 'Setup React Native project',
        description:
          'Initialize React Native with navigation and state management',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        projectId: mobileProject.id,
        createdById: jane.id,
        assigneeId: jane.id,
        completedAt: new Date('2024-01-10'),
      },
      {
        title: 'Create task list UI',
        description: 'Design and implement the main task list interface',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        projectId: mobileProject.id,
        createdById: jane.id,
        assigneeId: jane.id,
        dueDate: new Date('2024-01-30'),
      },
      {
        title: 'Add offline support',
        description: 'Implement offline data sync and storage',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        projectId: mobileProject.id,
        createdById: mike.id,
        assigneeId: john.id,
        dueDate: new Date('2024-03-01'),
      },
    ],
  });

  console.log('Created tasks');

  // Get created tasks for comments
  const createdTasks = await prisma.task.findMany({
    select: { id: true, title: true },
  });

  // Create Comments
  await prisma.comment.createMany({
    data: [
      {
        content:
          'Great work on the project setup! The TypeScript configuration looks solid.',
        taskId: createdTasks[0].id, // First task
        userId: jane.id,
      },
      {
        content:
          "I've started working on the authentication designs. Will share mockups soon.",
        taskId: createdTasks[1].id, // Auth task
        userId: jane.id,
      },
      {
        content:
          'Should we use JWT tokens for authentication or go with sessions?',
        taskId: createdTasks[1].id,
        userId: john.id,
      },
      {
        content:
          "JWT would be better for scalability. Let's discuss in the next standup.",
        taskId: createdTasks[1].id,
        userId: mike.id,
      },
      {
        content:
          'The React Native setup went smoothly. Expo made it really easy!',
        taskId: createdTasks[4].id, // RN setup task
        userId: jane.id,
      },
    ],
  });

  console.log('Created comments');

  // Create some sample attachments
  await prisma.attachment.createMany({
    data: [
      {
        fileName: 'wireframes.figma',
        fileUrl: 'https://figma.com/file/sample-wireframes',
        fileSize: 2048576, // 2MB
        mimeType: 'application/figma',
        projectId: webProject.id,
        userId: jane.id,
      },
      {
        fileName: 'api-documentation.pdf',
        fileUrl: 'https://storage.example.com/api-docs.pdf',
        fileSize: 1024000, // 1MB
        mimeType: 'application/pdf',
        projectId: webProject.id,
        userId: john.id,
      },
      {
        fileName: 'task-screenshot.png',
        fileUrl: 'https://storage.example.com/screenshot.png',
        fileSize: 512000, // 512KB
        mimeType: 'image/png',
        taskId: createdTasks[5].id, // Task UI task
        userId: jane.id,
      },
    ],
  });

  console.log('Created attachments');

  // Summary
  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    projectMembers: await prisma.projectMember.count(),
    tasks: await prisma.task.count(),
    comments: await prisma.comment.count(),
    attachments: await prisma.attachment.count(),
  };

  console.log('Seeding completed successfully!');
  console.log('Database summary:', counts);
  console.log('\n Test accounts:');
  console.log('  john@example.com (john_doe) - Project Owner');
  console.log('  jane@example.com (jane_smith) - Designer & Project Owner');
  console.log('  mike@example.com (mike_wilson) - Project Manager');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
