import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchJson, userFriendlyMessage } from '../lib/api';
import AlertBanner from './AlertBanner';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export default function CoordinatorDashboard() {
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
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

  const loadCourseKPIs = async () => {
    if (!selectedCourseId) return;
    setLoading(true); setError(null);
    try {
      const [cw, subs] = await Promise.all([
        fetchJson(`/api/classroom/courses/${selectedCourseId}/coursework`),
        fetchJson(`/api/classroom/courses/${selectedCourseId}/submissions`)
      ]);
      setCoursework(cw.coursework || []);
      setSubmissions(subs.submissions || []);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseKPIs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const data = coursework.map(cw => {
    const subsForCW = submissions.filter(s => s.courseWorkId === cw.id);
    const turnedIn = subsForCW.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
    return {
      name: cw.title?.slice(0, 14) || cw.id,
      completion: cw ? Math.round((turnedIn / Math.max(subsForCW.length, 1)) * 100) : 0
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Coordinator Dashboard</h1>
        {me && <div className="text-sm text-slate-500">{me.email}</div>}
      </div>

      {error && (
        <div className="mt-4">
          <AlertBanner type="error" title="No pudimos cargar la información" message={error} />
          <div className="text-xs text-slate-500 mt-1">
            Nota: Como coordinador, el acceso completo a roster puede requerir Domain-Wide Delegation o ser agregado como profesor.
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={loadCourses} className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800">Load Courses</button>
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
        <div className="mt-4"><EmptyState title="Sin cursos" subtitle="Presiona \"Load Courses\" para cargar cursos." /></div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-medium">Cohort Progress by Assignment</h2>
        <div className="mt-2 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="completion" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading && <div className="mt-4"><Spinner label="Cargando analíticas..." /></div>}
    </div>
  );
}
