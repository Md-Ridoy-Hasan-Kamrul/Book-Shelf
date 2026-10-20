import {
  forgotPasswordSchema,
  loginSchema,
  phoneSendOtpSchema,
  phoneVerifyOtpSchema,
  registerSchema,
  resetPasswordSchema,
} from '@bookverse/shared';
import { useState } from 'react';
import { authClient } from '../../lib/authClient';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { useMockData } from '../../lib/mockMode';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify-email' | 'verify-phone';

type MockRole = 'USER' | 'WRITER' | 'PUBLISHER' | 'VENDOR' | 'ADMIN' | 'MODERATOR';

type Props = {
  mode: Mode;
  resetToken?: string;
};

const MOCK_PRESETS: { role: MockRole; email: string; label: string }[] = [
  { role: 'ADMIN', email: 'admin@bookverse.local', label: 'Admin' },
  { role: 'VENDOR', email: 'vendor1@bookverse.local', label: 'Vendor' },
  { role: 'PUBLISHER', email: 'publisher1@bookverse.local', label: 'Publisher' },
  { role: 'WRITER', email: 'writer1@bookverse.local', label: 'Writer' },
  { role: 'USER', email: 'reader1@bookverse.local', label: 'Reader' },
];

export default function AuthForm({ mode, resetToken }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@bookverse.local');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [mockRole, setMockRole] = useState<MockRole>('ADMIN');

  function enterAs(role: MockRole) {
    setStatus('success');
    setMessage(`Mock ${role}: redirecting…`);
    // SSR sets cookie reliably (avoids client-only cookie + 502 from Vite proxy)
    window.location.href = `/mock-login?role=${encodeURIComponent(role)}`;
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const parsed = loginSchema.safeParse({ email, password, rememberMe: true });
    if (!parsed.success) {
      setStatus('error');
      setMessage('Invalid email or password');
      return;
    }
    if (useMockData()) {
      const preset = MOCK_PRESETS.find((p) => p.email === parsed.data.email);
      const role = preset?.role ?? mockRole;
      enterAs(role);
      return;
    }
    const { error } = await authClient.signIn.email(parsed.data);
    if (error) {
      setStatus('error');
      setMessage(error.message ?? 'Sign in failed');
      return;
    }
    setStatus('success');
    setMessage('Signed in: redirecting…');
    const next = new URLSearchParams(window.location.search).get('next');
    const q = next ? `?next=${encodeURIComponent(next)}` : '';
    window.location.href = `/post-login${q}`;
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setStatus('error');
      setMessage('Check name, email and password (min 8 chars)');
      return;
    }
    if (useMockData()) {
      setStatus('success');
      setMessage('Mock account created: open Profile.');
      window.location.href = '/mock-login?role=USER';
      return;
    }
    const { error } = await authClient.signUp.email({
      ...parsed.data,
      callbackURL: `${window.location.origin}/`,
    });
    if (error) {
      setStatus('error');
      setMessage(error.message ?? 'Sign up failed');
      return;
    }
    setStatus('success');
    setMessage('Check Mailpit (8025) for verification email.');
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setStatus('error');
      setMessage('Enter a valid email');
      return;
    }
    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setStatus('error');
      setMessage(error.message ?? 'Request failed');
      return;
    }
    setStatus('success');
    setMessage('If the email exists, reset link sent: check Mailpit.');
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const token = resetToken ?? new URLSearchParams(window.location.search).get('token') ?? '';
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setStatus('error');
      setMessage('Token and password (min 8) required');
      return;
    }
    const { error } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token: parsed.data.token,
    });
    if (error) {
      setStatus('error');
      setMessage(error.message ?? 'Reset failed');
      return;
    }
    setStatus('success');
    setMessage('Password updated: you can log in.');
  }

  async function onResendVerify(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    if (!email) {
      setStatus('error');
      setMessage('Enter your email');
      return;
    }
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/`,
    });
    if (error) {
      setStatus('error');
      setMessage(error.message ?? 'Could not send');
      return;
    }
    setStatus('success');
    setMessage('Verification email sent: Mailpit.');
  }

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const parsed = phoneSendOtpSchema.safeParse({ phone });
    if (!parsed.success) {
      setStatus('error');
      setMessage('Use BD mobile 01XXXXXXXXX');
      return;
    }
    try {
      await apiFetch('/phone/send-otp', z.object({ sent: z.boolean() }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      setStatus('success');
      setMessage('OTP sent: see API terminal (console SMS).');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const parsed = phoneVerifyOtpSchema.safeParse({ phone, code: otp });
    if (!parsed.success) {
      setStatus('error');
      setMessage('Phone and 6-digit code required');
      return;
    }
    try {
      await apiFetch('/phone/verify-otp', z.object({ phoneVerified: z.boolean() }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      setStatus('success');
      setMessage('Phone verified.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Invalid OTP');
    }
  }

  const busy = status === 'loading';

  return (
    <div className="mx-auto w-full max-w-md rounded-(--radius-card) border border-line bg-paper p-6 shadow-(--shadow-warm)">
      {mode === 'login' && (
        <form onSubmit={onLogin} className="space-y-4">
          {useMockData() ? (
            <div className="space-y-3 rounded-(--radius-card) border border-line bg-sand/60 p-3">
              <p className="m-0 text-xs text-ink-500">
                Prefer the role list above, or sign in with any password using a demo email.
              </p>
              <Select
                label="Demo role"
                value={mockRole}
                options={MOCK_PRESETS.map((p) => ({
                  value: p.role,
                  label: `${p.label}: ${p.email}`,
                }))}
                onChange={(e) => {
                  const role = e.target.value as MockRole;
                  setMockRole(role);
                  const preset = MOCK_PRESETS.find((p) => p.role === role);
                  if (preset) setEmail(preset.email);
                }}
              />
            </div>
          ) : null}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="cta" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
      )}
      {mode === 'register' && (
        <form onSubmit={onRegister} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="cta" disabled={busy} className="w-full">
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      )}
      {mode === 'forgot' && (
        <form onSubmit={onForgot} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="cta" disabled={busy} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      {mode === 'reset' && (
        <form onSubmit={onReset} className="space-y-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="cta" disabled={busy} className="w-full">
            Update password
          </Button>
        </form>
      )}
      {mode === 'verify-email' && (
        <form onSubmit={onResendVerify} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="brand" disabled={busy} className="w-full">
            Resend verification
          </Button>
        </form>
      )}
      {mode === 'verify-phone' && (
        <div className="space-y-6">
          <form onSubmit={onSendOtp} className="space-y-4">
            <Input label="Phone (BD)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button type="submit" variant="brand" disabled={busy} className="w-full">
              Send OTP
            </Button>
          </form>
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <Input label="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <Button type="submit" variant="cta" disabled={busy} className="w-full">
              Verify phone
            </Button>
          </form>
        </div>
      )}
      {message && (
        <p
          className={`mt-4 text-sm ${status === 'error' ? 'text-urgent-600' : status === 'success' ? 'text-leaf-700' : 'text-ink-500'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
