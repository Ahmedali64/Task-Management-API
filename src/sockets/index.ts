import { Socket, Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../utils/jwt.util';
import { getUserProfile } from '../services/auth.service';
// Socket user interface
interface SocketUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

interface HandshakeAuth {
  token?: string;
}

// Store online users
const onlineUsers = new Map<string, AuthenticatedSocket>();

// Initialize Socket.io server
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.io
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  io.use(async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      const auth = socket.handshake.auth as HandshakeAuth;
      const token = auth.token || socket.handshake.headers?.authorization;

      if (!token) {
        throw new Error('No token provided');
      }

      // Clean token the verify it
      const cleanToken = token.replace('Bearer ', '');
      /*
      userId: string;
      email: string;
      username: string;
      */
      const payload = verifyAccessToken(cleanToken);
      const userData = await getUserProfile(payload.userId);

      socket.user = {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      };
      next();
    } catch (error) {
      if (error instanceof Error) {
        console.log('Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      } else {
        console.log('Socket authentication failed:', error);
        next(new Error('Authentication failed: Unknown error'));
      }
    }
  });

  // Handle connections
  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(
      `User ${socket.user?.username} connected with socket ID: ${socket.id}`
    );

    // Store online user
    if (socket.user) {
      onlineUsers.set(socket.user.id, socket);
      // Join user's personal room (for direct notifications)
      // Note
      /*
        - Why are we doing this?
          * socket.id is temporary. It changes whenever the user disconnects/reconnects. 
          * A single user might open your app in:
            - Chrome on desktop,
            - Safari on mobile,
            - Another tab.
            - That’s 3 different sockets.
            - If you only target one socket.id, the others miss out.
      */
      await socket.join(`user:${socket.user.id}`);
    }

    // Handle joining project rooms
    // Frontend will send projectId whith the emit event
    // Socket here is the user
    socket.on('join_project', async (projectId: string) => {
      if (!projectId) return;
      await socket.join(`project:${projectId}`);
      console.log(
        `User ${socket.user?.username} joined project room: ${projectId}`
      );

      // Notify other project members that user is online
      socket.to(`project:${projectId}`).emit('user_joined_project', {
        user: socket.user,
        timestamp: new Date(),
      });
    });

    // Handle leaving project rooms
    socket.on('leave_project', async (projectId: string) => {
      if (!projectId) return;

      await socket.leave(`project:${projectId}`);
      console.log(
        `User ${socket.user?.username} left project room: ${projectId}`
      );

      // Notify other project members that user left
      socket.to(`project:${projectId}`).emit('user_left_project', {
        user: socket.user,
        timestamp: new Date(),
      });
    });

    // Handle typing indicators for comments
    socket.on('typing_start', (data: { taskId: string; projectId: string }) => {
      socket.to(`project:${data.projectId}`).emit('user_typing', {
        taskId: data.taskId,
        user: socket.user,
        timestamp: new Date(),
      });
    });

    socket.on('typing_stop', (data: { taskId: string; projectId: string }) => {
      socket.to(`project:${data.projectId}`).emit('user_stopped_typing', {
        taskId: data.taskId,
        user: socket.user,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.user?.username} disconnected: ${reason}`);

      if (socket.user) {
        onlineUsers.delete(socket.user.id);
      }
    });
  });

  return io;
};

// Get online users count
export const getOnlineUsersCount = (): number => {
  return onlineUsers.size;
};

// Get specific user's socket if online
export const getUserSocket = (
  userId: string
): AuthenticatedSocket | undefined => {
  return onlineUsers.get(userId);
};

// Check if user is online
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// Export the socket instance (will be set during initialization)
// setSocketInstance(io) -> stores the io object once, when the server starts.
// getSocketInstance() -> lets any other file grab the same io instance later.
let socketInstance: SocketIOServer;

export const setSocketInstance = (io: SocketIOServer): void => {
  socketInstance = io;
};

export const getSocketInstance = (): SocketIOServer => {
  return socketInstance;
};
