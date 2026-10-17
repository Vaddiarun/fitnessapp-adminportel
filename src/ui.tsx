import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black',
  accent: 'bg-accent text-white hover:brightness-95',
  ghost: 'bg-sunk text-ink hover:bg-line',
  danger: 'border border-red-600 text-red-700 hover:bg-red-50',
};

export function Button({ variant = 'primary', loading, icon, children, className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...props} disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANT[variant]} ${className}`}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] ${className}`}>{children}</section>
);

export const Eyebrow = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <p className={`text-[11px] font-bold uppercase tracking-[0.12em] text-muted ${className}`}>{children}</p>
);

export const Title = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <h1 className={`font-display text-4xl uppercase leading-none ${className}`}>{children}</h1>
);

const fieldClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-ink';

export function Input({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const input = <input {...props} className={`${fieldClass} ${className}`} />;
  return label ? <label className="grid gap-1 text-xs font-bold text-muted">{label}{input}</label> : input;
}

export function Select({ label, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const select = <select {...props} className={`${fieldClass} ${className}`}>{children}</select>;
  return label ? <label className="grid gap-1 text-xs font-bold text-muted">{label}{select}</label> : select;
}

export const ErrorBox = ({ children }: { children?: ReactNode }) =>
  children ? <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{children}</div> : null;

export const Pill = ({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'good' | 'accent' | 'warn' }) => {
  const cls = { plain: 'bg-sunk text-ink', good: 'bg-good-soft text-good', accent: 'bg-accent-soft text-accent', warn: 'bg-warn-soft text-warn' }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
};

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>
);
