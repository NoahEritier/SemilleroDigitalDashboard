import { useEffect, useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function Home() {
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [coursework, setCoursework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCourseWorkId, setSelectedCourseWorkId] = useState('');
  const [error, setError] = useState(null);

  const fetchMe = async () => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/me`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not logged in');
      const data = await res.json();
      setMe(data);
    } catch (e) {
      setMe(null);
      setError(e.message);
    }
  };

  const fetchCourses = async () => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/classroom/courses`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load courses');
      const data = await res.json();
      const list = data.courses || [];
      setCourses(list);
      if (list.length > 0) setSelectedCourseId(list[0].id);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchStudents = async () => {
    setError(null);
    setStudents([]);
    try {
      if (!selectedCourseId) throw new Error('Select a course first');
      const res = await fetch(`${BACKEND}/api/classroom/courses/${selectedCourseId}/students`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchCoursework = async () => {
    setError(null);
    setCoursework([]);
    setSelectedCourseWorkId('');
    try {
      if (!selectedCourseId) throw new Error('Select a course first');
      const res = await fetch(`${BACKEND}/api/classroom/courses/${selectedCourseId}/coursework`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load coursework');
      const data = await res.json();
      const list = data.coursework || [];
      setCoursework(list);
      if (list.length > 0) setSelectedCourseWorkId(list[0].id);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchSubmissions = async () => {
    setError(null);
    setSubmissions([]);
    try {
      if (!selectedCourseId) throw new Error('Select a course first');
      const params = new URLSearchParams();
      if (selectedCourseWorkId) params.set('courseWorkId', selectedCourseWorkId);
      params.set('userId', 'me');
      const res = await fetch(`${BACKEND}/api/classroom/courses/${selectedCourseId}/submissions?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Google Classroom Companion</h1>

      {!me && (
        <a href={`${BACKEND}/auth/google`}>
          <button style={{ padding: '8px 12px', marginTop: 12 }}>Login with Google</button>
        </a>
      )}

      {me && (
        <>
          <div style={{ marginTop: 16 }}>
            <div>Signed in as: <b>{me.email}</b></div>
            {me.picture && <img src={me.picture} alt="avatar" style={{ width: 48, height: 48, borderRadius: 24 }} />}
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={fetchCourses} style={{ padding: '8px 12px' }}>
              Load My Courses
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <label>
              Course:
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <span style={{ marginLeft: 12 }}>
              <a
                href={courses.find(c => c.id === selectedCourseId)?.alternateLink || '#'}
                target="_blank"
                rel="noreferrer"
              >open in Classroom</a>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={fetchStudents} style={{ padding: '8px 12px' }}>Load Students</button>
            <button onClick={fetchCoursework} style={{ padding: '8px 12px' }}>Load Coursework</button>
            <button onClick={fetchSubmissions} style={{ padding: '8px 12px' }}>Load My Submissions</button>
          </div>

          {/* Students */}
          {students.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Students ({students.length})</h3>
              <ul>
                {students.map((s) => (
                  <li key={s.id}>{s.name || s.email || s.id}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Coursework */}
          {coursework.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Coursework ({coursework.length})</h3>
              <label>
                Assignment:
                <select
                  value={selectedCourseWorkId}
                  onChange={(e) => setSelectedCourseWorkId(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  {coursework.map(cw => (
                    <option key={cw.id} value={cw.id}>{cw.title || cw.id}</option>
                  ))}
                </select>
              </label>
              <ul>
                {coursework.map((cw) => (
                  <li key={cw.id}>
                    <b>{cw.title}</b> ({cw.workType}) - state: {cw.state}
                    {cw.dueDate ? ` | due: ${new Date(cw.dueDate).toLocaleString()}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submissions */}
          {submissions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>My Submissions ({submissions.length})</h3>
              <ul>
                {submissions.map((s) => (
                  <li key={s.id}>
                    {s.courseWorkId} - {s.state}
                    {typeof s.assignedGrade === 'number' ? ` | grade: ${s.assignedGrade}` : ''}
                    {s.late ? ' | LATE' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form method="POST" action={`${BACKEND}/api/logout`}>
            <button style={{ marginTop: 12, padding: '8px 12px' }}>Logout</button>
          </form>
        </>
      )}

      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
    </div>
  );
}
