# Google Classroom Companion - System Architecture

## 1. Technology Stack

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand
- **Authentication**: NextAuth.js with Google Provider
- **Charts/Analytics**: Recharts
- **Notifications**: React Hot Toast

**Justification**:
- Next.js provides excellent developer experience, built-in API routes, and seamless Vercel deployment
- Server-side rendering improves SEO and initial load times
- Tailwind CSS ensures rapid UI development with consistent design
- NextAuth.js handles OAuth2 flow with Google seamlessly
- Zustand offers lightweight state management without Redux complexity

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database ORM**: Prisma
- **Authentication**: NextAuth.js + JWT
- **API Integration**: Google Classroom API SDK
- **Validation**: Zod
- **Background Jobs**: Vercel Cron Jobs / Upstash QStash

**Justification**:
- Next.js API routes eliminate need for separate backend deployment
- Prisma provides type-safe database operations and easy migrations
- Built-in support for Google OAuth2 and API integration
- Serverless architecture scales automatically and reduces costs

### Database
- **Primary**: PostgreSQL (Vercel Postgres / Supabase)
- **Cache**: Redis (Upstash Redis)
- **File Storage**: Vercel Blob / Cloudinary

**Justification**:
- PostgreSQL offers robust relational data handling for educational data
- Redis provides fast caching for frequently accessed classroom data
- Managed services reduce operational overhead

### Infrastructure & Deployment
- **Hosting**: Vercel (Frontend + API)
- **Database**: Vercel Postgres
- **Monitoring**: Vercel Analytics + Sentry
- **CI/CD**: GitHub Actions + Vercel Git Integration

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React)                                       │
│  ├── Student Dashboard     ├── Teacher Dashboard                │
│  ├── Coordinator Portal    ├── Notification Center             │
│  └── Progress Analytics    └── Communication Hub                │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                             │
│  ├── Authentication (/api/auth/*)                               │
│  ├── User Management (/api/users/*)                            │
│  ├── Classroom Sync (/api/classroom/*)                         │
│  ├── Progress Tracking (/api/progress/*)                       │
│  ├── Notifications (/api/notifications/*)                      │
│  └── Analytics (/api/analytics/*)                              │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   GOOGLE APIs   │ │   DATABASE      │ │   CACHE LAYER   │
│                 │ │                 │ │                 │
│ ├── Classroom   │ │ PostgreSQL      │ │ Redis           │
│ ├── OAuth2      │ │ (Prisma ORM)    │ │ (Upstash)       │
│ ├── People      │ │                 │ │                 │
│ └── Gmail       │ │ ├── Users       │ │ ├── Sessions    │
│                 │ │ ├── Courses     │ │ ├── API Cache   │
│                 │ │ ├── Progress    │ │ └── Temp Data   │
│                 │ │ ├── Notifications│ │                │
│                 │ │ └── Analytics   │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│ ├── Email Service (SendGrid/Resend)                             │
│ ├── File Storage (Vercel Blob)                                 │
│ ├── Monitoring (Sentry)                                        │
│ └── Background Jobs (Vercel Cron)                              │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Data Model

### Core Entities

```typescript
// User Management
User {
  id: string (UUID)
  email: string (unique) // Matches Google Classroom
  name: string
  avatar?: string
  role: UserRole (STUDENT, TEACHER, COORDINATOR, ADMIN)
  googleId: string
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  enrollments: CourseEnrollment[]
  teachingCourses: Course[]
  notifications: Notification[]
  progressRecords: ProgressRecord[]
}

// Course Management
Course {
  id: string (UUID)
  googleClassroomId: string (unique)
  name: string
  description?: string
  section?: string
  room?: string
  ownerId: string // Teacher
  state: CourseState (ACTIVE, ARCHIVED, PROVISIONED)
  createdAt: DateTime
  updatedAt: DateTime
  lastSyncAt: DateTime
  
  // Relations
  owner: User
  enrollments: CourseEnrollment[]
  assignments: Assignment[]
  announcements: Announcement[]
  progressRecords: ProgressRecord[]
}

CourseEnrollment {
  id: string (UUID)
  userId: string
  courseId: string
  role: CourseRole (STUDENT, TEACHER, OWNER)
  joinedAt: DateTime
  
  // Relations
  user: User
  course: Course
}

// Academic Content
Assignment {
  id: string (UUID)
  googleClassroomId: string (unique)
  courseId: string
  title: string
  description?: string
  dueDate?: DateTime
  maxPoints?: number
  state: AssignmentState (PUBLISHED, DRAFT, DELETED)
  workType: WorkType (ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION)
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  course: Course
  submissions: Submission[]
}

Submission {
  id: string (UUID)
  googleClassroomId: string (unique)
  assignmentId: string
  userId: string
  state: SubmissionState (NEW, CREATED, TURNED_IN, RETURNED, RECLAIMED_BY_STUDENT)
  assignedGrade?: number
  draftGrade?: number
  submittedAt?: DateTime
  returnedAt?: DateTime
  
  // Relations
  assignment: Assignment
  student: User
}

// Communication
Announcement {
  id: string (UUID)
  googleClassroomId: string (unique)
  courseId: string
  text: string
  state: AnnouncementState (PUBLISHED, DRAFT, DELETED)
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  course: Course
}

Notification {
  id: string (UUID)
  userId: string
  type: NotificationType (ASSIGNMENT_DUE, GRADE_POSTED, ANNOUNCEMENT, COURSE_UPDATE)
  title: string
  message: string
  relatedEntityId?: string
  relatedEntityType?: string
  isRead: boolean
  createdAt: DateTime
  
  // Relations
  user: User
}

// Analytics & Progress
ProgressRecord {
  id: string (UUID)
  userId: string
  courseId: string
  assignmentId?: string
  metric: ProgressMetric (ASSIGNMENT_COMPLETION, GRADE_AVERAGE, PARTICIPATION, ATTENDANCE)
  value: number
  period: string // e.g., "2024-Q1", "2024-03"
  recordedAt: DateTime
  
  // Relations
  user: User
  course: Course
  assignment?: Assignment
}

// System
SyncLog {
  id: string (UUID)
  entityType: string (Course, Assignment, etc.)
  entityId: string
  action: SyncAction (CREATE, UPDATE, DELETE)
  status: SyncStatus (SUCCESS, FAILED, PENDING)
  errorMessage?: string
  syncedAt: DateTime
}
```

### Key Relationships

- **User ↔ Course**: Many-to-many through CourseEnrollment
- **Course → Assignment**: One-to-many
- **Assignment → Submission**: One-to-many
- **User → Submission**: One-to-many (as student)
- **User → Notification**: One-to-many
- **User → ProgressRecord**: One-to-many

## 4. API Endpoints

### Authentication
```
POST   /api/auth/signin           # Google OAuth2 login
POST   /api/auth/signout          # Logout
GET    /api/auth/session          # Get current session
GET    /api/auth/callback/google  # OAuth2 callback
```

### User Management
```
GET    /api/users/me              # Get current user profile
PUT    /api/users/me              # Update user profile
GET    /api/users/[id]            # Get user by ID (admin only)
GET    /api/users                 # List users (admin/coordinator)
```

### Course Management
```
GET    /api/courses               # List user's courses
GET    /api/courses/[id]          # Get course details
POST   /api/courses/sync          # Sync courses from Google Classroom
GET    /api/courses/[id]/students # Get course students
GET    /api/courses/[id]/assignments # Get course assignments
```

### Assignment & Submissions
```
GET    /api/assignments           # List assignments (filtered by course/user)
GET    /api/assignments/[id]      # Get assignment details
GET    /api/assignments/[id]/submissions # Get assignment submissions
POST   /api/assignments/sync      # Sync assignments from Google Classroom
```

### Progress & Analytics
```
GET    /api/progress/student/[id] # Get student progress summary
GET    /api/progress/course/[id]  # Get course progress analytics
GET    /api/analytics/dashboard   # Get coordinator dashboard data
POST   /api/progress/calculate    # Recalculate progress metrics
```

### Notifications
```
GET    /api/notifications         # Get user notifications
PUT    /api/notifications/[id]/read # Mark notification as read
POST   /api/notifications/mark-all-read # Mark all as read
DELETE /api/notifications/[id]    # Delete notification
```

### Communication
```
GET    /api/announcements         # Get course announcements
POST   /api/announcements         # Create announcement (teachers only)
PUT    /api/announcements/[id]    # Update announcement
DELETE /api/announcements/[id]    # Delete announcement
```

### System & Sync
```
POST   /api/sync/full             # Full sync from Google Classroom
GET    /api/sync/status           # Get sync status
POST   /api/sync/courses          # Sync specific courses
GET    /api/health                # Health check endpoint
```

### Webhooks (Future Enhancement)
```
POST   /api/webhooks/classroom    # Google Classroom push notifications
POST   /api/webhooks/calendar     # Google Calendar events
```

## 5. Security Considerations

- **OAuth2 Flow**: Secure Google authentication with proper scopes
- **JWT Tokens**: Stateless authentication with refresh token rotation
- **API Rate Limiting**: Prevent abuse with rate limiting middleware
- **Data Validation**: Zod schemas for all API inputs
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Environment Variables**: Secure storage of API keys and secrets

## 6. Scalability & Performance

- **Caching Strategy**: Redis for frequently accessed data
- **Database Indexing**: Proper indexes on foreign keys and search fields
- **API Pagination**: Cursor-based pagination for large datasets
- **Background Jobs**: Async processing for heavy operations
- **CDN**: Static asset delivery through Vercel Edge Network
- **Database Connection Pooling**: Efficient database connections

## 7. Deployment Strategy

1. **Development**: Local development with Docker Compose
2. **Staging**: Vercel preview deployments for each PR
3. **Production**: Vercel production deployment with custom domain
4. **Database Migrations**: Prisma migrations in CI/CD pipeline
5. **Environment Management**: Separate configs for each environment
6. **Monitoring**: Real-time error tracking and performance monitoring

This architecture provides a solid foundation for building a scalable Google Classroom companion application with modern web technologies and best practices.
