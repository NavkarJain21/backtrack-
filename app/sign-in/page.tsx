"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAuthStore,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from "@/lib/auth";
import { Compass, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 px-3.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white";

type Mode = "signin" | "signup";

export default function SignInPage() {
  const router = useRouter();
  const { user, signIn, signUp, status, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-xl shadow-slate-200/60">
          <Compass className="mx-auto text-blue-600" size={28} aria-hidden />
          <h1 className="text-lg font-bold text-slate-900">
            Signed in as {user.name}
          </h1>
          <p className="text-xs text-slate-500">{user.email}</p>
          {user.isDemoSession && (
            <p className="text-[11px] text-amber-600">
              Demo session — no real backend is connected yet.
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white"
            >
              Continue to Backtrack
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const errs: Record<string, string> = {};
    if (mode === "signup") {
      const e1 = validateName(name);
      if (e1) errs.name = e1;
    }
    const e2 = validateEmail(email);
    if (e2) errs.email = e2;
    const e3 = validatePassword(password);
    if (e3) errs.password = e3;
    if (mode === "signup") {
      const e4 = validatePasswordConfirm(password, confirm);
      if (e4) errs.confirm = e4;
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const ok =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(name, email, password);
    if (ok) {
      toast.success(
        mode === "signin" ? "Welcome back to Backtrack!" : "Account created. Welcome to Backtrack!"
      );
      router.push("/");
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setFieldErrors({});
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden">
      {/* Soft decorative shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-100/60 via-violet-100/40 to-transparent blur-3xl pointer-events-none -z-10" />

      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
            <Compass size={20} aria-hidden />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Backtrack
          </span>
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/60">
          <div className="text-center mb-6">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Your career, reverse-engineered.
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              {mode === "signin"
                ? "Sign in to resume your roadmap."
                : "Create your account to start your roadmap."}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-6"
          >
            {(
              [
                { id: "signin", label: "Sign In" },
                { id: "signup", label: "Create Account" },
              ] as { id: Mode; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={mode === t.id}
                onClick={() => switchMode(t.id)}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  mode === t.id
                    ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 border border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <Field label="Name" error={fieldErrors.name}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-label="Name"
                  aria-invalid={!!fieldErrors.name}
                  className={inputClass}
                />
              </Field>
            )}
            <Field label="Email" error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-label="Email"
                aria-invalid={!!fieldErrors.email}
                className={inputClass}
              />
            </Field>
            <Field label="Password" error={fieldErrors.password}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                aria-label="Password"
                aria-invalid={!!fieldErrors.password}
                className={inputClass}
              />
            </Field>
            {mode === "signup" && (
              <Field label="Confirm Password" error={fieldErrors.confirm}>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  aria-label="Confirm Password"
                  aria-invalid={!!fieldErrors.confirm}
                  className={inputClass}
                />
              </Field>
            )}

            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={13} aria-hidden />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {status === "loading" ? (
                "Working…"
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight size={14} aria-hidden />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => toast("Password reset is not wired up in this demo yet.", { icon: "ℹ️" })}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              Forgot password?
            </button>
          </div>

          {/* OAuth: not configured — shown disabled, never fake */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <button
              disabled
              aria-disabled="true"
              title="Configure a Google OAuth provider to enable this."
              className="w-full min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Sparkles size={14} aria-hidden />
              Continue with Google (not configured)
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-slate-400">
            Demo build: credentials are checked locally only and never stored or sent anywhere.
          </p>
        </div>
      </main>

    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
