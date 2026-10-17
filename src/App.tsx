import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { session, setSignedOutHandler } from './api';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Member from './pages/Member';

export default function App() {
  const [signedIn, setSignedIn] = useState(() => !!session.get());
  const navigate = useNavigate();

  useEffect(() => {
    setSignedOutHandler(() => { setSignedIn(false); navigate('/login'); });
  }, [navigate]);

  const signOut = () => { session.clear(); setSignedIn(false); navigate('/login'); };

  if (!signedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login onSignedIn={() => { setSignedIn(true); navigate('/'); }} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-2xl italic uppercase">AI<span className="text-accent">/</span>Fitness <span className="ml-1 align-middle font-body text-xs font-bold not-italic tracking-[0.15em] text-white/60">ADMIN</span></Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members/:id" element={<Member />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
