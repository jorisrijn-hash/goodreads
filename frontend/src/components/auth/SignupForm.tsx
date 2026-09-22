"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { AuthField } from "./AuthField";
import { AuthStatus, AuthSubmit } from "./AuthSubmit";
import { FormError } from "./FormError";
import { useAuthSubmission } from "./useAuthSubmission";

/** The API's own rule; shown as it is, with no invented strength score. */
const MIN_PASSWORD = 10;

/**
 * Sign-up, not onboarding: three fields, then straight into the product.
 */
export function SignupForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [focusSummary, setFocusSummary] = useState(true);
  const emailRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { submission, copy, run, busy } = useAuthSubmission();

  /** Field errors: say so once, and put focus on the first field that needs attention. */
  function showFieldErrors(errors: Record<string, string>) {
    setFieldErrors(errors);
    setFocusSummary(false);
    setSummary("Some fields need attention.");
    const first = (["email", "username", "password"] as const).find((k) => errors[k]);
    const target = { email: emailRef, username: usernameRef, password: passwordRef };
    if (first) requestAnimationFrame(() => target[first].current?.focus());
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const missing: Record<string, string> = {};
    if (!email.trim()) missing.email = "Enter your email.";
    if (!username.trim()) missing.username = "Choose a username.";
    if (!password) missing.password = "Choose a password.";
    if (Object.keys(missing).length) return showFieldErrors(missing);

    setSummary(null);
    setFieldErrors({});
    const result = await run("signup", () => api.signUp({ email, username, password }), "/home");
    if (result === "ok" || result === "busy") return;
    if (result instanceof ApiError && result.status < 500) {
      if (Object.keys(result.fieldErrors).length) return showFieldErrors(result.fieldErrors);
      setFocusSummary(true);
      setSummary(result.message);
    } else {
      setFocusSummary(true);
      setSummary("Couldn’t reach the library just now. Your details are still here; please try again.");
    }
  }

  async function demo() {
    if (busy) return;
    setSummary(null);
    setFieldErrors({});
    const result = await run("demo", () => api.enterDemo(), "/home");
    if (result !== "ok" && result !== "busy") {
      setFocusSummary(true);
      setSummary("The demo account could not be opened just now. Please try again.");
    }
  }

  const count = password.length;
  return (
    <form method="post" onSubmit={submit} noValidate aria-busy={busy || undefined} className="auth-form">
      <FormError message={summary} focus={focusSummary} />

      <div className="auth-fields auth-in auth-in--3">
        <AuthField ref={emailRef} label="Email" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={fieldErrors.email} locked={busy} autoFocus enterKeyHint="next" />
        <AuthField
          ref={usernameRef}
          label="Username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={setUsername}
          error={fieldErrors.username}
          hint="Letters, numbers and underscores."
          locked={busy}
          enterKeyHint="next"
        />
        <AuthField
          ref={passwordRef}
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          hint={`At least ${MIN_PASSWORD} characters. Length matters more than symbols.`}
          aside={count === 0 ? null : count < MIN_PASSWORD ? `${count} / ${MIN_PASSWORD} characters` : `${MIN_PASSWORD}+ characters ✓`}
          locked={busy}
          enterKeyHint="go"
        />
      </div>

      <div className="auth-in auth-in--4">
        <AuthSubmit kind="signup" label="Create account" submission={submission} copy={copy} />
        <AuthStatus submission={submission} copy={copy} />

        <p className="auth-or" aria-hidden="true"><span>or</span></p>

        <AuthSubmit kind="demo" type="button" variant="demo" label="Explore demo account" submission={submission} copy={copy} onClick={demo} />

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </form>
  );
}
