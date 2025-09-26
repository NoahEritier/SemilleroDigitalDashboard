import { google } from 'googleapis';

// Utility: fetch all pages for a list API
async function fetchAllPages(fetchFn, params = {}) {
  let items = [];
  let pageToken = undefined;
  do {
    const { data } = await fetchFn({ ...params, pageToken });
    const pageItems = data.courses || data.studentSubmissions || data.courseWork || data.students || [];
    items = items.concat(pageItems);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

// Normalize helpers
function normalizeCourse(course) {
  return {
    id: course.id,
    name: course.name,
    section: course.section || null,
    state: course.courseState,
    ownerId: course.ownerId,
    alternateLink: course.alternateLink || null,
    room: course.room || null,
    creationTime: course.creationTime || null,
    updateTime: course.updateTime || null
  };
}

function normalizeUserProfile(profile) {
  return {
    id: profile.id,
    email: profile.emailAddress || null,
    name: profile.name?.fullName || null,
    photoUrl: profile.photoUrl || null
  };
}

function normalizeStudent(student) {
  return normalizeUserProfile(student.profile);
}

function normalizeCoursework(cw) {
  const dueDate = cw.dueDate
    ? new Date(Date.UTC(
        cw.dueDate.year || 1970,
        (cw.dueDate.month || 1) - 1,
        cw.dueDate.day || 1,
        cw.dueTime?.hours || 0,
        cw.dueTime?.minutes || 0,
        cw.dueTime?.seconds || 0
      )).toISOString()
    : null;
  return {
    id: cw.id,
    courseId: cw.courseId,
    title: cw.title || null,
    description: cw.description || null,
    dueDate,
    maxPoints: typeof cw.maxPoints === 'number' ? cw.maxPoints : null,
    state: cw.state,
    workType: cw.workType,
    alternateLink: cw.alternateLink || null,
    creationTime: cw.creationTime || null,
    updateTime: cw.updateTime || null
  };
}

function normalizeSubmission(s) {
  return {
    id: s.id,
    courseId: s.courseId,
    courseWorkId: s.courseWorkId,
    userId: s.userId,
    state: s.state, // NEW, CREATED, TURNED_IN, RETURNED, etc.
    assignedGrade: typeof s.assignedGrade === 'number' ? s.assignedGrade : null,
    draftGrade: typeof s.draftGrade === 'number' ? s.draftGrade : null,
    late: typeof s.late === 'boolean' ? s.late : null,
    updateTime: s.updateTime || null,
    // Keep minimal history info if present
    submissionHistory: Array.isArray(s.submissionHistory)
      ? s.submissionHistory.map(h => ({
          state: h.stateHistory?.state || null,
          grade: h.gradeHistory?.pointsEarned ?? null,
          timestamp: h.stateHistory?.stateTimestamp || h.gradeHistory?.gradeTimestamp || null
        }))
      : []
  };
}

// Error mapping
function mapGoogleError(err) {
  const status = err?.code || err?.response?.status || 500;
  const reason = err?.errors?.[0]?.reason || err?.response?.data?.error || err?.message || 'Unknown error';
  // Token errors commonly: invalid_grant, invalid_token
  if (status === 401 || reason.includes('invalid_grant') || reason.includes('invalid_token')) {
    return { code: 'AUTH_REAUTH', status: 401, message: 'Authentication expired. Please sign in again.' };
  }
  if (status === 403) {
    return { code: 'INSUFFICIENT_PERMISSIONS', status: 403, message: 'Insufficient permissions or Classroom API scopes.' };
  }
  if (status === 404) {
    // Google may return 404 for resources the user cannot access (e.g., roster if not a teacher)
    return { code: 'NOT_FOUND_OR_FORBIDDEN', status: 404, message: 'Resource not found or not accessible with current role.' };
  }
  return { code: 'GOOGLE_API_ERROR', status, message: reason };
}

// Create a Classroom SDK client from an authorized oauth2Client
function classroomClient(oauth2Client) {
  return google.classroom({ version: 'v1', auth: oauth2Client });
}

// 1) List courses for current user
export async function listCourses(oauth2Client, { states = ['ACTIVE'] } = {}) {
  try {
    const classroom = classroomClient(oauth2Client);
    const items = await fetchAllPages(classroom.courses.list.bind(classroom.courses), {
      courseStates: states
    });
    return items.map(normalizeCourse);
  } catch (err) {
    throw mapGoogleError(err);
  }
}

// 2) List students in a course
export async function listCourseStudents(oauth2Client, courseId) {
  try {
    const classroom = classroomClient(oauth2Client);
    const items = await fetchAllPages(classroom.courses.students.list.bind(classroom.courses.students), {
      courseId
    });
    return items.map(normalizeStudent);
  } catch (err) {
    throw mapGoogleError(err);
  }
}

// 3) List coursework (assignments) for a course
export async function listCoursework(oauth2Client, courseId, { states = ['PUBLISHED'] } = {}) {
  try {
    const classroom = classroomClient(oauth2Client);
    const items = await fetchAllPages(classroom.courses.courseWork.list.bind(classroom.courses.courseWork), {
      courseId,
      courseWorkStates: states
    });
    return items.map(normalizeCoursework);
  } catch (err) {
    throw mapGoogleError(err);
  }
}

// 4) List student submissions
// You can filter by courseWorkId or userId; both optional. If none provided, returns all submissions for the course.
export async function listStudentSubmissions(
  oauth2Client,
  courseId,
  { courseWorkId = undefined, userId = undefined, states = undefined } = {}
) {
  try {
    const classroom = classroomClient(oauth2Client);
    // Google API requires courseWorkId for studentSubmissions.list.
    // If not provided, aggregate submissions across all coursework in the course.
    if (!courseWorkId) {
      const allCoursework = await fetchAllPages(
        classroom.courses.courseWork.list.bind(classroom.courses.courseWork),
        { courseId }
      );
      const all = [];
      // Fetch submissions per coursework id; respect optional userId/states filters
      for (const cw of allCoursework) {
        const params = { courseId, courseWorkId: cw.id };
        if (userId) params.userId = userId;
        if (states) params.states = states;
        const items = await fetchAllPages(
          classroom.courses.courseWork.studentSubmissions.list.bind(classroom.courses.courseWork.studentSubmissions),
          params
        );
        all.push(...items);
      }
      return all.map(normalizeSubmission);
    }

    // If courseWorkId provided, fetch submissions for that coursework only
    const params = { courseId, courseWorkId };
    if (userId) params.userId = userId; // 'me' or userId
    if (states) params.states = states;

    const items = await fetchAllPages(
      classroom.courses.courseWork.studentSubmissions.list.bind(classroom.courses.courseWork.studentSubmissions),
      params
    );
    return items.map(normalizeSubmission);
  } catch (err) {
    throw mapGoogleError(err);
  }
}

// Usage helper: Example of how to wire routes (see server.js integration)
export function exampleUsageComment() {
  return `
// Example usage inside an Express route:
// const oauth2Client = await getAuthorizedClientForUser(userId);
// const courses = await listCourses(oauth2Client);
// const students = await listCourseStudents(oauth2Client, courseId);
// const coursework = await listCoursework(oauth2Client, courseId);
// const submissions = await listStudentSubmissions(oauth2Client, courseId, { courseWorkId, userId: 'me' });
`;
}

// Detect current user's role in a course
export async function getUserRoleInCourse(oauth2Client, courseId) {
  const classroom = classroomClient(oauth2Client);
  // Try teacher role
  try {
    await classroom.courses.teachers.get({ courseId, userId: 'me' });
    return 'TEACHER';
  } catch (err) {
    // ignore and try student
  }
  try {
    await classroom.courses.students.get({ courseId, userId: 'me' });
    return 'STUDENT';
  } catch (err) {
    // neither teacher nor student (maybe coordinator with no direct membership)
  }
  return 'UNKNOWN';
}
