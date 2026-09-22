import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { SignupForm } from "@/components/auth/SignupForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Create an account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/home");

  return (
    <>
      <AuthHeading label="Your library" title="Create your account." intro="Three fields. No questionnaire." />
      <SignupForm />
    </>
  );
}
