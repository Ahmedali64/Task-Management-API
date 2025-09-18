import { PrismaClient } from '../generated/prisma';

// Prisma Clint Instance
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// Test Connection
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    // Test query to verify connection
    const userCount = await prisma.user.count();
    console.log(`Current users in database: ${userCount}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// ShutDown DataBase Gracefully
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected gracefully');
  } catch (error) {
    console.error('Error disconnecting database:', error);
  }
};

// Handl shutdown when u press ctrl + c in the terminal during dev
process.on('SIGINT', () => {
  void (async () => {
    await disconnectDatabase();
    process.exit(0);
  })();
});

// Handl shutdown when the systen kills the process
process.on('SIGTERM', () => {
  void (async () => {
    await disconnectDatabase();
    process.exit(0);
  })();
});

export default prisma;
