# TaskFlow API

A comprehensive task management REST API with real-time collaboration, team management, and advanced caching.

## Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, email verification, and password reset
- **Team Collaboration**: Projects with role-based permissions (Owner, Admin, Member, Viewer)
- **Task Management**: Full CRUD operations with status tracking, priorities, assignments, and due dates
- **Real-time Updates**: WebSocket integration for live task and comment updates
- **Comments System**: Threaded discussions on tasks
- **Caching Layer**: Redis caching for high-performance data access
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Comprehensive Testing**: Unit and integration tests with Jest

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MySQL with Prisma ORM
- **Caching**: Redis
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI
- **Email**: Nodemailer

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- Redis
- npm or yarn

---

## Installation

1. Clone the repository
```bash
https://github.com/Ahmedali64/Task-Management-API.git
cd Task-Management-API
```
2. Install dependencies

```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Run database migrations
```bash
npx prisma migrate dev
```

5. Start the development server

```bash
npm run dev
```

## API Documentation

```bash
http://localhost:3000/api-docs
```
# Docker Deployment

```bash
docker-compose up --build
```

## Testing (Not fully implemented)
```bash
npm test
```
---
##  Project Structure
```bash
src/
├── config/          # Configuration files (database, redis, swagger)
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Custom middleware (auth, validation, permissions)
├── routes/          # API routes
├── sockets/         # WebSocket event handlers
├── utils/           # Utility functions
└── app.ts           # Application entry point
```

## Features Showcase

#### Real-time Collaboration
WebSocket events for instant updates when:

* Tasks are created, updated, or deleted
* Comments are added
* Team members join projects

#### Intelligent Caching
Redis caching layer reduces database load:

* User projects cached for 15 minutes
* Task details cached for 5 minutes
* Automatic cache invalidation on updates

#### Advanced Filtering
Task filtering by:

* Status (TODO, IN_PROGRESS, DONE, IN_REVIEW, CANCELLED)
* Priority (LOW, MEDIUM, HIGH, URGENT)
* Assignee
* Due date
* Search text

#### Role-Based Access Control
Four permission levels:

* Owner: Full control including deletion
* Admin: Manage members and settings
* Member: Create and edit tasks
* Viewer: Read-only access

--- 
## Author
* **Name**: Ahmed Ali
*  [**github**](https://github.com/Ahmedali64)
*  [**LinkedIn**](www.linkedin.com/in/ahmed-ali-esmail)


