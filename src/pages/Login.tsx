import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, session } from '../api';
import { Button, ErrorBox, Input } from '../ui';

export default function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  /** null while checking; true when the server has no admin yet and this page creates the first one. */
  const [setup, setSetup] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.setupStatus().then((r) => setSetup(r.needsSetup)).catch(() => setSetup(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (setup && password !== confirm) return setError('The two passwords don’t match.');
    setBusy(true);
    try {
      const r = setup ? await api.setup(email.trim(), password) : await api.login(email.trim(), password);
      session.set(r.token);
      onSignedIn();
    } catch (err) {
      const message = (err as Error).message;
      // Someone else finished setup in the meantime: switch to the normal sign-in.
      if (setup && /already exists/i.test(message)) setSetup(false);
      if (!setup && /create one first/i.test(message)) setSetup(true);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={submit} className="grid w-full max-w-sm gap-5 rounded-3xl bg-surface p-7">
        <div className="grid gap-2">
          <p className="font-display text-3xl italic uppercase">AI<span className="text-accent">/</span>Fitness</p>
          <h1 className="font-display text-5xl uppercase leading-[0.95]">Coach<br /><span className="text-accent">admin</span></h1>
          <p className="text-sm text-muted">
            {setup
              ? 'First time here: create the admin account. Only one can be created this way, so use your own email.'
              : 'Find members by number and set their diet. Changes show in their app right away.'}
          </p>
        </div>
        <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={setup ? 'Choose a password (8+ characters)' : 'Password'} type="password" autoComplete={setup ? 'new-password' : 'current-password'}
          minLength={setup ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {setup ? (
          <Input label="Repeat password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        ) : null}
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" variant="accent" loading={busy} disabled={setup === null} icon={<ArrowRight className="h-4 w-4" />} className="py-3 text-base">
          {setup ? 'Create admin account' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
