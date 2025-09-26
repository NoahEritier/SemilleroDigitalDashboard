import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { google } from 'googleapis';
import { upsertUser, upsertTokens, getTokensByUserIdProvider, getUserById } from './store.js';
import { encrypt, decrypt } from './crypto.js';
import { listCourses, listCourseStudents, listCoursework, listStudentSubmissions, getUserRoleInCourse } from './classroomService.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
];

app.get('/auth/google', (req, res) => {
  const oauth2Client = createOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    include_granted_scopes: true,
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    const email = profile.email;
    const name = profile.name || '';
    const picture = profile.picture || '';

    const userId = upsertUser({ email, name, picture });

    if (tokens.refresh_token) {
      const { ciphertext, iv, tag } = encrypt(tokens.refresh_token);
      upsertTokens({
        userId,
        provider: 'google',
        accessToken: tokens.access_token || null,
        refreshEncrypted: ciphertext,
        iv,
        tag,
        expiryDate: tokens.expiry_date || null,
        scope: tokens.scope || null
      });
    }

    req.session.userId = userId;
    req.session.email = email;
    req.session.save(() => {
      const redirect = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(`${redirect}/auth/success`);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth2 callback error');
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ id: user.id, email: user.email, name: user.name, picture: user.picture });
});

async function getAuthorizedClientForUser(userId) {
  const row = getTokensByUserIdProvider(userId, 'google');
  if (!row) throw new Error('No tokens found for user');

  // Convert base64-encoded fields to Buffers for decryption
  const encrypted = Buffer.from(row.refresh_token_encrypted_b64, 'base64');
  const iv = Buffer.from(row.refresh_iv_b64, 'base64');
  const tag = Buffer.from(row.refresh_tag_b64, 'base64');
  const refreshToken = decrypt(encrypted, iv, tag);
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      console.log('New refresh_token received — consider updating storage.');
    }
  });
  return oauth2Client;
}

app.get('/api/classroom/courses', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const oauth2Client = await getAuthorizedClientForUser(req.session.userId);
    const courses = await listCourses(oauth2Client, { states: ['ACTIVE'] });
    res.json({ courses });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Failed to fetch courses', code: err.code || 'UNKNOWN' });
  }
});

// List students in a specific course
app.get('/api/classroom/courses/:courseId/students', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { courseId } = req.params;
    const oauth2Client = await getAuthorizedClientForUser(req.session.userId);
    const role = await getUserRoleInCourse(oauth2Client, courseId);
    if (role !== 'TEACHER') {
      return res.status(403).json({
        error: 'Only teachers can view the roster of a course. Ask the course owner to add you as a teacher.',
        code: 'ROLE_REQUIRED_TEACHER'
      });
    }
    const students = await listCourseStudents(oauth2Client, courseId);
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch students', code: err.code || 'UNKNOWN' });
  }
});

// List coursework (assignments) for a course
app.get('/api/classroom/courses/:courseId/coursework', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { courseId } = req.params;
    const statesParam = req.query.states; // optional comma-separated states
    const states = statesParam ? String(statesParam).split(',') : ['PUBLISHED'];
    const oauth2Client = await getAuthorizedClientForUser(req.session.userId);
    const coursework = await listCoursework(oauth2Client, courseId, { states });
    res.json({ coursework });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch coursework', code: err.code || 'UNKNOWN' });
  }
});

// List student submissions. Optional query: courseWorkId, userId, states (comma-separated)
app.get('/api/classroom/courses/:courseId/submissions', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { courseId } = req.params;
    const { courseWorkId, userId, states: statesParam } = req.query;
    const states = statesParam ? String(statesParam).split(',') : undefined;
    const oauth2Client = await getAuthorizedClientForUser(req.session.userId);
    const submissions = await listStudentSubmissions(oauth2Client, courseId, {
      courseWorkId: courseWorkId ? String(courseWorkId) : undefined,
      userId: userId ? String(userId) : undefined,
      states
    });
    res.json({ submissions });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch submissions', code: err.code || 'UNKNOWN' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`OAuth2 backend listening on http://localhost:${PORT}`);
});
