import { useEffect, useMemo, useState } from 'react';
import { fetchJson, ApiError, userFriendlyMessage } from '../lib/api';
import AlertBanner from './AlertBanner';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export default function StudentDashboard() {
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [coursework, setCoursework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson('/api/me');
        setMe(data);
      } catch (e) {
        setError(userFriendlyMessage(e));
      }
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

  const loadCoursework = async () => {
    if (!selectedCourseId) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchJson(`/api/classroom/courses/${selectedCourseId}/coursework`);
      setCoursework(data.coursework || []);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  const loadMySubmissions = async () => {
    if (!selectedCourseId) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchJson(`/api/classroom/courses/${selectedCourseId}/submissions?userId=me`);
      setSubmissions(data.submissions || []);
    } catch (e) { setError(userFriendlyMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadCoursework();
      loadMySubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  // Classify coursework into deliverables vs non-deliverables
  const deliverables = useMemo(() => {
    return coursework.filter(cw => (
      typeof cw.maxPoints === 'number' ||
      ['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'].includes(cw.workType)
    ));
  }, [coursework]);

  const nonDeliverables = useMemo(() => {
    return coursework.filter(cw => !(
      typeof cw.maxPoints === 'number' ||
      ['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'].includes(cw.workType)
    ));
  }, [coursework]);

  // Helper: determine if a submission counts as delivered (TURNED_IN or RETURNED now, or was TURNED_IN in history)
  const isSubmissionDelivered = (s) => {
    if (!s) return false;
    if (s.state === 'TURNED_IN' || s.state === 'RETURNED') return true;
    if (Array.isArray(s.submissionHistory)) {
      return s.submissionHistory.some(h => h.state === 'TURNED_IN');
    }
    return false;
  };

  // Progress = proportion of deliverables that have a delivered submission
  const completion = useMemo(() => {
    const denom = deliverables.length;
    if (!denom) return 0;
    const deliveredSet = new Set(
      submissions
        .filter(isSubmissionDelivered)
        .map(s => s.courseWorkId)
    );
    const num = deliverables.filter(cw => deliveredSet.has(cw.id)).length;
    return Math.round((num / denom) * 100);
  }, [deliverables, submissions]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Student Dashboard</h1>
        {me && <div className="text-sm text-slate-500">{me.email}</div>}
      </div>

      {error && (
        <div className="mt-4">
          <AlertBanner
            type="error"
            title="No pudimos cargar la información"
            message={error}
            actionLabel="Reintentar"
            onAction={() => {
              if (!courses.length) return loadCourses();
              if (!selectedCourseId) return loadCourses();
              // retry both loads for current course
              loadCoursework();
              loadMySubmissions();
            }}
          />
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
            className="block mt-1 w-full max-w-md border rounded px-2 py-2 bg-white text-slate-900 dark:bg-white dark:text-slate-900"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState title="No hay cursos" subtitle='Presiona "Load My Courses" para cargar tus cursos.' />
        </div>
      )}

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Progress</h2>
          <div className="text-sm text-slate-500">{completion}% completed</div>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded mt-2">
          <div className="h-3 bg-green-500 rounded" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {/* Coursework - Deliverables */}
      <div className="mt-6">
        <h2 className="text-lg font-medium">My Tasks (Deliverables)</h2>
        {deliverables.length ? (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {deliverables.map(cw => {
              const delivered = submissions.some(s => (s.courseWorkId === cw.id) && isSubmissionDelivered(s));
              return (
              <div key={cw.id} className="border rounded p-3">
                <div className="font-medium">{cw.title}</div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <span>{cw.workType} • {cw.state}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${delivered ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                    {delivered ? 'Entregado' : 'Pendiente'}
                  </span>
                </div>
                {cw.dueDate && <div className="text-sm">Due: {new Date(cw.dueDate).toLocaleString()}</div>}
              </div>
            );})}
          </div>
        ) : (
          <div className="mt-2"><EmptyState title="Sin tareas con entrega" subtitle="No hay entregables por ahora." /></div>
        )}
      </div>

      {/* Coursework - Non deliverables */}
      <div className="mt-6">
        <h2 className="text-lg font-medium">Information / No Deliverables</h2>
        {nonDeliverables.length ? (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {nonDeliverables.map(cw => (
              <div key={cw.id} className="border rounded p-3">
                <div className="font-medium">{cw.title}</div>
                <div className="text-sm text-slate-500">{cw.workType} • {cw.state}</div>
                {cw.dueDate && <div className="text-sm">Due: {new Date(cw.dueDate).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2"><EmptyState title="Sin material informativo" subtitle="No hay publicaciones sin entrega por ahora." /></div>
        )}
      </div>

      {/* Notifications (placeholder) */}
      <div className="mt-6">
        <h2 className="text-lg font-medium">Notifications</h2>
        <AlertBanner type="info" title="Próximamente" message="Aquí verás recordatorios de entregas, calificaciones y anuncios." />
      </div>

      {loading && <div className="mt-4"><Spinner label="Cargando datos..." /></div>}
    </div>
  );
}
