import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../Logo.jsx';
import Spinner from '../Spinner.jsx';

const COPY = {
  login: {
    title: 'Welcome back',
    subtitle: 'Log in to pick up where you left off.',
    submit: 'Log in',
    switchPrompt: "Don't have an account?",
    switchTo: '/register',
    switchLabel: 'Sign up',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Start chatting with Gemini in seconds.',
    submit: 'Create account',
    switchPrompt: 'Already have an account?',
    switchTo: '/login',
    switchLabel: 'Log in',
  },
};

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const copy = COPY[mode];
  const { login, register } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      // On success GuestRoute sees the user and redirects into the app.
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={44} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{copy.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <Field label="Name" name="name" autoComplete="name" value={form.name} onChange={update} maxLength={60} required />
          )}
          <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={update}
            minLength={isRegister ? 8 : undefined}
            maxLength={72}
            hint={isRegister ? 'At least 8 characters' : undefined}
            required
          />

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting && <Spinner size={16} className="text-white" />}
            {copy.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {copy.switchPrompt}{' '}
          <Link to={copy.switchTo} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, name, hint, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input id={name} name={name} className="input" {...inputProps} />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
