'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Eye, EyeOff, Lock, Mail, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('admin@example.com');
  const [password, setPassword] = React.useState('Admin@123456');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check credentials.');
        setLoading(false);
        return;
      }

      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (err) {
      setError('Unable to reach authentication server. Please try again.');
      setLoading(false);
    }
  };

  const autofillDemo = (role: 'admin' | 'operator') => {
    if (role === 'admin') {
      setEmail('admin@example.com');
      setPassword('Admin@123456');
    } else {
      setEmail('operator@example.com');
      setPassword('Operator@123456');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-background dark:to-emerald-950/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white shadow-xl shadow-emerald-500/20 mb-4">
          <MessageSquare className="w-8 h-8 fill-white/20" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
          Sign in to WABulk
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Simple. Powerful. Official WhatsApp Messaging Platform.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-6 shadow-xl border border-border sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 flex items-center space-x-2 rounded-xl bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Remember me for 30 days</span>
              </label>
              <span className="text-xs text-muted-foreground hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full h-11 text-sm font-semibold mt-2"
            >
              Sign In to Workspace
            </Button>
          </form>

          {/* Quick Seed Credentials Box */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
                Demo Credentials:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => autofillDemo('admin')}
                className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted text-[11px] font-medium text-foreground transition-all"
              >
                <span>Super Admin</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold">ALL</span>
              </button>
              <button
                type="button"
                onClick={() => autofillDemo('operator')}
                className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted text-[11px] font-medium text-foreground transition-all"
              >
                <span>Operator</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">OPS</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              Protected by encrypted sessions and role-based access control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
