"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { AuthField } from "./AuthField";
import { AuthStatus, AuthSubmit } from "./AuthSubmit";
import { FormError } from "./FormError";
import { useAuthSubmission } from "./useAuthSubmission";

/**
 * Sign in. `returnTo` arrives already validated by the page (safeReturnTo), so it is
 * always a path on this application.
 *
 * `method="post"` matters only without JavaScript: the form cannot sign in then (the
 * API needs its CSRF header), but it must never put a password in a URL.
 */
export function LoginForm({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { submission, copy, run, busy } = useAuthSubmission();

  function clearErrors() {
    setSummary(null);
    setFieldErrors({});
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    // Empty fields are answered here, without a round trip to a possibly sleeping API.
    const missing: Record<string, string> = {};
    if (!email.trim()) missing.email = "Enter your email.";
    if (!password) missing.password = "Enter your password.";
    if (Object.keys(missing).length) {
      setSummary(null);
      setFieldErrors(missing);
      (missing.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    clearErrors();
    const result = await run("login", () => api.logIn({ email, password }), returnTo);
    if (result !== "ok" && result !== "busy") fail(result);
  }

  async function demo() {
    if (busy) return;
    clearErrors();
    const result = await run("demo", () => api.enterDemo(), returnTo);
    if (result !== "ok" && result !== "busy") setSummary("The demo account could not be opened just now. Please try again.");
  }

  function fail(error: unknown) {
    if (error instanceof ApiError && error.status < 500) {
      setFieldErrors(error.fieldErrors);
      // The API says the same thing for a wrong password and an unknown account;
      // repeating it verbatim keeps that property.
      setSummary(error.message);
    } else {
      // Nothing was decided; keep what was typed and let them try again.
      setSummary("Couldn’t reach the library just now. Your details are still here; please try again.");
    }
  }

  return (
    <form method="post" onSubmit={submit} noValidate aria-busy={busy || undefined} className="auth-form">
      <FormError message={summary} />

      <div className="auth-fields auth-in auth-in--3">
        <AuthField
          ref={emailRef}
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          locked={busy}
          autoFocus
          enterKeyHint="next"
        />
        <AuthField
          ref={passwordRef}
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          locked={busy}
          enterKeyHint="go"
        />
      </div>

      <div className="auth-in auth-in--4">
        <AuthSubmit kind="login" label="Sign in" submission={submission} copy={copy} />
        <AuthStatus submission={submission} copy={copy} />

        <p className="auth-or" aria-hidden="true"><span>or</span></p>

        <AuthSubmit kind="demo" type="button" variant="demo" label="Explore demo account" submission={submission} copy={copy} onClick={demo} />

        <p className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </form>
  );
}
