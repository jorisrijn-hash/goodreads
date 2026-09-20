"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import { safeReturnTo } from "@/lib/return-to";
import { Button } from "./Button";
import { DemoButton } from "./DemoButton";
import { ErrorSummary } from "./ErrorSummary";
import { FormField } from "./FormField";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Validated even though it came from our own URL: anyone can craft the link.
  const returnTo = safeReturnTo(params.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSummary(null);
    setFieldErrors({});

    try {
      await api.logIn({ email, password });
      router.push(returnTo);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        // The backend deliberately says the same thing for a wrong password and an
        // unknown account. Repeating it verbatim keeps that property intact.
        setSummary(error.message);
      } else {
        setSummary("Could not reach the server. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[var(--space-6)]">
      <ErrorSummary message={summary} />

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
        autoFocus
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
      />

      <Button type="submit" loading={loading}>
        Sign in
      </Button>

      <div className="flex items-center gap-[var(--space-4)]" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs uppercase tracking-[0.12em] text-[var(--ink-60)]">or</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <DemoButton returnTo={returnTo} />

      <p className="text-sm text-[var(--ink-70)]">
        New here?{" "}
        <Link href="/signup" className="text-[var(--forest)] underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
