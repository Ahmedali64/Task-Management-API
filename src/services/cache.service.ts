import redisClient from '../config/redis';
import { Project, Task } from '@prisma/client';

// Cache key prefixes for organization
export const CACHE_KEYS = {
  USER_PROJECTS: 'user:projects:',
  PROJECT_TASKS: 'project:tasks:',
  USER_PROFILE: 'user:profile:',
  TASK_DETAILS: 'task:details:',
  PROJECT_MEMBERS: 'project:members:',
} as const; // Force ts to infer the actuall value not as a string type but as an  value

// Cache TTL in seconds
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 15 * 60, // 15 minutes
  LONG: 60 * 60, // 1 hour
} as const;

export type CachedUserProfile = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
};

// Generic cache get function
// We will use generics here cause JSON.parse return any so we cast it (as T) to tell TypeScript trust me this matches the type the caller expects
export const getCached = async <T>(key: string): Promise<T | null> => {
  try {
    if (!redisClient.isOpen) {
      return null;
    }
    const data = await redisClient.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

// Generic cache set function
export const setCached = async <T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> => {
  try {
    if (!redisClient.isOpen) return;

    await redisClient.set(key, JSON.stringify(data), {
      expiration: { type: 'EX', value: ttl },
    });
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
};

// Delete cache entry
export const deleteCached = async (key: string): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      return;
    }

    await redisClient.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
};

// Delete multiple cache entries by pattern (prefex ex "user:123:*" )
export const deleteCachedByPattern = async (pattern: string): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      return;
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`Cache pattern delete error for pattern ${pattern}:`, error);
  }
};

// Specific caching functions for our application --------

//Cache user's projects
export const cacheUserProjects = async (
  userId: string,
  data: { projects: Project[]; total: number }
): Promise<void> => {
  await setCached(
    `${CACHE_KEYS.USER_PROJECTS}${userId}`,
    data,
    CACHE_TTL.MEDIUM
  );
};

//Cache user's single project
export const cacheUserProject = async (
  userId: string,
  project: Project
): Promise<void> => {
  await setCached(
    `${CACHE_KEYS.USER_PROJECTS}${userId}`,
    project,
    CACHE_TTL.MEDIUM
  );
};

// Get cached user projects
export const getCachedUserProjects = async <T>(
  userId: string
): Promise<T | null> => {
  return getCached(`${CACHE_KEYS.USER_PROJECTS}${userId}`);
};

// Cache project tasks
export const cacheProjectTasks = async (
  projectId: string,
  tasks: Task[]
): Promise<void> => {
  await setCached(
    `${CACHE_KEYS.PROJECT_TASKS}${projectId}`,
    tasks,
    CACHE_TTL.SHORT
  );
};

// Get cached project tasks
export const getCachedProjectTasks = async (
  projectId: string
): Promise<any> => {
  return getCached(`${CACHE_KEYS.PROJECT_TASKS}${projectId}`);
};

// Cache user profile
export const cacheUserProfile = async (
  userId: string,
  profile: CachedUserProfile
): Promise<void> => {
  await setCached(
    `${CACHE_KEYS.USER_PROFILE}${userId}`,
    profile,
    CACHE_TTL.LONG
  );
};

// Get cached user profile
export const getCachedUserProfile = async (userId: string): Promise<any> => {
  return getCached(`${CACHE_KEYS.USER_PROFILE}${userId}`);
};

// Cache task details
export const cacheTaskDetails = async (
  taskId: string,
  task: Task
): Promise<void> => {
  await setCached(`${CACHE_KEYS.TASK_DETAILS}${taskId}`, task, CACHE_TTL.SHORT);
};

// Get cached task details
export const getCachedTaskDetails = async <T>(
  taskId: string
): Promise<T | null> => {
  return getCached(`${CACHE_KEYS.TASK_DETAILS}${taskId}`);
};

// delete all caches related to a user
export const invalidateUserCaches = async (userId: string): Promise<void> => {
  await Promise.all([
    deleteCached(`${CACHE_KEYS.USER_PROJECTS}${userId}`),
    deleteCached(`${CACHE_KEYS.USER_PROFILE}${userId}`),
  ]);
};

// delete all caches related to a project
export const invalidateProjectCaches = async (
  projectId: string
): Promise<void> => {
  await Promise.all([
    deleteCached(`${CACHE_KEYS.PROJECT_TASKS}${projectId}`),
    deleteCached(`${CACHE_KEYS.PROJECT_MEMBERS}${projectId}`),
    // Also invalidate user projects cache for all project members
    deleteCachedByPattern(`${CACHE_KEYS.USER_PROJECTS}*`),
  ]);
};

// delete all caches related to a task
export const invalidateTaskCaches = async (
  taskId: string,
  projectId: string
): Promise<void> => {
  await Promise.all([
    deleteCached(`${CACHE_KEYS.TASK_DETAILS}${taskId}`),
    deleteCached(`${CACHE_KEYS.PROJECT_TASKS}${projectId}`),
    deleteCachedByPattern(`${CACHE_KEYS.USER_PROJECTS}*`),
  ]);
};
