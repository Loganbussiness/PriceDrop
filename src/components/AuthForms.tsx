"use client";

import { useActionState } from "react";
import { loginUser, registerUser } from "@/app/actions/auth";

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 outline-none ring-[var(--accent)] focus:ring-2";

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => registerUser(formData),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm text-[var(--muted)]">
        Name
        <input name="name" className={`${inputClass} mt-1`} autoComplete="name" />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Email
        <input
          name="email"
          type="email"
          required
          className={`${inputClass} mt-1`}
          autoComplete="email"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className={`${inputClass} mt-1`}
          autoComplete="new-password"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-[var(--avoid)]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-[var(--ink)] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => loginUser(formData),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm text-[var(--muted)]">
        Email
        <input
          name="email"
          type="email"
          required
          className={`${inputClass} mt-1`}
          autoComplete="email"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Password
        <input
          name="password"
          type="password"
          required
          className={`${inputClass} mt-1`}
          autoComplete="current-password"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-[var(--avoid)]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-[var(--ink)] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
