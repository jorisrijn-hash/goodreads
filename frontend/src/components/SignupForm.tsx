"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import { Button } from "./Button";
import { ErrorSummary } from "./ErrorSummary";
import { FormField } from "./FormField";

/**
 * Signup, not onboarding. Three fields, then straight into the application — genres,
 * favourite books and any other preference-gathering belong to product work later,
 * when something actually consumes them.
 */
export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      await api.signUp({ email, username, password });
      router.push("/home");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setSummary(
          Object.keys(error.fieldErrors).length > 0
            ? "Some fields need attention."
            : error.message,
        );
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
        label="Username"
        name="username"
        autoComplete="username"
        value={username}
        onChange={setUsername}
        error={fieldErrors.username}
        hint="Letters, numbers and underscores."
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
        hint="At least 10 characters. Length matters more than symbols."
      />

      <Button type="submit" loading={loading}>
        Create account
      </Button>

      <p className="text-sm text-[var(--ink-70)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--forest)] underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
