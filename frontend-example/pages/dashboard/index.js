import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function DashboardHome() {
  const [role, setRole] = useState('student');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    if (saved) setRole(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('role', role);
  }, [role]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-600 mt-2">Select your role to navigate to the appropriate dashboard. This selector can be wired to server-side roles later.</p>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setRole('student')} className={`px-3 py-2 rounded border ${role==='student'?'bg-slate-900 text-white':'hover:bg-slate-50'}`}>Student</button>
          <button onClick={() => setRole('teacher')} className={`px-3 py-2 rounded border ${role==='teacher'?'bg-slate-900 text-white':'hover:bg-slate-50'}`}>Teacher</button>
          <button onClick={() => setRole('coordinator')} className={`px-3 py-2 rounded border ${role==='coordinator'?'bg-slate-900 text-white':'hover:bg-slate-50'}`}>Coordinator</button>
        </div>

        <div className="mt-6">
          {role === 'student' && (
            <a href="/dashboard/student" className="px-4 py-2 inline-block rounded bg-green-600 text-white hover:bg-green-500">Go to Student Dashboard</a>
          )}
          {role === 'teacher' && (
            <a href="/dashboard/teacher" className="px-4 py-2 inline-block rounded bg-blue-600 text-white hover:bg-blue-500">Go to Teacher Dashboard</a>
          )}
          {role === 'coordinator' && (
            <a href="/dashboard/coordinator" className="px-4 py-2 inline-block rounded bg-purple-600 text-white hover:bg-purple-500">Go to Coordinator Dashboard</a>
          )}
        </div>
      </div>
    </Layout>
  );
}
