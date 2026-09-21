import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in: there is nothing to do here.
  if (await getCurrentUser()) redirect("/home");

  return (
    <AuthLayout
      title="Welcome back."
      intro="Pick up where your reading left off."
    >
      {/* useSearchParams needs a Suspense boundary to keep the route prerenderable. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
