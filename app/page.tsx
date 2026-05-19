"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Loader2, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router, supabase.auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const adminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "junelfuentes.02@gmail.com";
    if (data.user?.email !== adminEmail) {
      await supabase.auth.signOut();
      setError("Access denied. This dashboard is restricted to the system administrator.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-[30rem] h-[30rem] bg-purple-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo Area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary-light)] border border-[var(--color-primary-border)] rounded-2xl mb-5 shadow-lg shadow-[var(--color-primary)]/10">
            <Shield className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Super Admin
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">
            PUNCH POS — Internal Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Email
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/60 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/60 transition-all"
              />
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Sign In with Email
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-6 w-full py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-transparent shadow-md"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Sign In with Google
          </button>
        </div>

        <p className="text-center text-[var(--color-text-muted)] text-xs mt-6">
          Restricted access · Super administrators only
        </p>
      </div>
    </div>
  );
}
