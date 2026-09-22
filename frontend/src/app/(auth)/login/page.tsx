import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeReturnTo } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  // Already signed in: there is nothing to do here.
  if (await getCurrentUser()) redirect("/home");
  // Validated even though it came from our own URL: anyone can craft the link. Read here
  // rather than with useSearchParams, whose Suspense boundary would hide the whole form
  // from a reader without JavaScript.
  const returnTo = safeReturnTo((await searchParams).returnTo);

  return (
    <>
      <AuthHeading label="Welcome back" title="Sign in." intro="Pick up where your reading left off." />
      <LoginForm returnTo={returnTo} />
    </>
  );
}
