import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * auth — provider-ready authentication abstraction.
 *
 * IMPORTANT: There is no production auth backend configured for Backtrack yet.
 * The current implementation is an honest DEVELOPMENT/DEMO session:
 *  - passwords are validated client-side and NEVER stored or transmitted
 *  - the persisted session contains only the user's name + email
 *  - `isDemoSession` is true so the UI can disclose demo behavior clearly
 *
 * To connect a real provider later, implement `signIn`/`signUp`/`signOut`
 * against your API and set `isDemoSession: false`. The shape of `AuthUser`
 * and the store API are designed to stay stable.
 */

export interface AuthUser {
  name: string;
  email: string;
  /** True until a real auth provider is wired in. */
  isDemoSession: boolean;
}

export type AuthStatus = "idle" | "loading" | "error";

interface AuthStore {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => void;
  clearError: () => void;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Enter a valid email address.";
}

export function validateName(name: string): string | null {
  return name.trim().length > 0 ? null : "Name is required.";
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  return password.length >= 8
    ? null
    : "Password must be at least 8 characters.";
}

export function validatePasswordConfirm(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Please confirm your password.";
  return password === confirm ? null : "Passwords don't match.";
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned
    ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
    : "Backtrack User";
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      status: "idle",
      error: null,

      signIn: async (email, password) => {
        set({ status: "loading", error: null });
        const emailErr = validateEmail(email);
        const pwErr = validatePassword(password);
        if (emailErr || pwErr) {
          set({ status: "error", error: emailErr ?? pwErr });
          return false;
        }
        // Demo session only — see file header. Never store the password.
        set({
          user: { name: nameFromEmail(email), email: email.trim(), isDemoSession: true },
          status: "idle",
          error: null,
        });
        return true;
      },

      signUp: async (name, email, password) => {
        set({ status: "loading", error: null });
        const nameErr = validateName(name);
        const emailErr = validateEmail(email);
        const pwErr = validatePassword(password);
        const firstError = nameErr ?? emailErr ?? pwErr;
        if (firstError) {
          set({ status: "error", error: firstError });
          return false;
        }
        set({
          user: { name: name.trim(), email: email.trim(), isDemoSession: true },
          status: "idle",
          error: null,
        });
        return true;
      },

      signOut: () => set({ user: null, status: "idle", error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "backtrack-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
