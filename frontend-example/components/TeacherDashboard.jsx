import { useEffect, useMemo, useState } from 'react';
import { fetchJson, userFriendlyMessage } from '../lib/api';
import AlertBanner from './AlertBanner';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export default function TeacherDashboard() {
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [students, setStudents] = useState([]);
  const [coursework, setCoursework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson('/api/me');
        setMe(data);
      } catch (e) { setError(userFriendlyMessage(e)); }
    })();
  }, []);

  const loadCourses = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchJson('/api/classroom/courses');
      const list = data.courses || [];
      setCourses(list);
      if (list.length > 0) setSelectedCourseId(list[0].id);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  const loadStudents = async () => {
    if (!selectedCourseId) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchJson(`/api/classroom/courses/${selectedCourseId}/students`);
      setStudents(data.students || []);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  const loadCoursework = async () => {
    if (!selectedCourseId) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchJson(`/api/classroom/courses/${selectedCourseId}/coursework`);
      setCoursework(data.coursework || []);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  const loadAllSubmissions = async () => {
    if (!selectedCourseId) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchJson(`/api/classroom/courses/${selectedCourseId}/submissions`);
      setSubmissions(data.submissions || []);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadStudents();
      loadCoursework();
      loadAllSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const submissionMap = useMemo(() => {
    const map = new Map();
    for (const s of submissions) {
      const m = map.get(s.userId) || { turnedIn: 0, returned: 0, total: 0 };
      m.total += 1;
      if (s.state === 'TURNED_IN') m.turnedIn += 1;
      if (s.state === 'RETURNED') m.returned += 1;
      map.set(s.userId, m);
    }
    return map;
  }, [submissions]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
        {me && <div className="text-sm text-slate-500">{me.email}</div>}
      </div>

      {error && (
        <div className="mt-4">
          <AlertBanner
            type="error"
            title="No pudimos cargar la información"
            message={error}
          />
          <div className="text-xs text-slate-500 mt-1">
            Nota: Para ver estudiantes debes ser profesor del curso. Si ves un error de permisos, solicita ser agregado como co-teacher.
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={loadCourses} className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800">Load My Courses</button>
        <a href="/" className="px-3 py-2 rounded border border-slate-300 hover:bg-slate-50">Back</a>
      </div>

      {courses.length > 0 ? (
        <div className="mt-4">
          <label className="text-sm">Course</label>
          <select
            className="block mt-1 w-full max-w-md border rounded px-2 py-2"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mt-4"><EmptyState title="Sin cursos" subtitle="Presiona \"Load My Courses\" para cargar tus cursos." /></div>
      )}

      {/* Students table with submission summary */}
      <div className="mt-6">
        <h2 className="text-lg font-medium">Student Submissions</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Turned In</th>
                <th className="py-2 pr-4">Returned</th>
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const stat = submissionMap.get(s.id) || { turnedIn: 0, returned: 0, total: 0 };
                return (
                  <tr key={s.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 pr-4">{s.name || s.email || s.id}</td>
                    <td className="py-2 pr-4">{stat.turnedIn}</td>
                    <td className="py-2 pr-4">{stat.returned}</td>
                    <td className="py-2 pr-4">{stat.total}</td>
                  </tr>
                );
              })}
              {!students.length && (
                <tr><td className="py-3 text-slate-500" colSpan={4}>Sin estudiantes o sin permisos (debes ser profesor del curso).</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance placeholder */}
      <div className="mt-6">
        <h2 className="text-lg font-medium">Attendance</h2>
        <p className="text-sm text-slate-600">Attendance no es provisto por la API de Classroom. Podemos integrar Google Sheets o un módulo propio.</p>
      </div>

      {loading && <div className="mt-4"><Spinner label="Cargando..." /></div>}
    </div>
  );
}
