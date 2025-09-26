export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="font-semibold">Classroom Companion</a>
          <nav className="flex gap-3 text-sm">
            <a className="hover:underline" href="/">Home</a>
            <a className="hover:underline" href="/dashboard">Dashboard</a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
