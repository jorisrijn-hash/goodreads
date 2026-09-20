import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { SignupForm } from "@/components/SignupForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Create an account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/home");

  return (
    <AuthLayout
      title="Start your reading life."
      intro="Three fields. No questionnaire."
      footer={
        <p>
          An independent case study. Please do not reuse a password from anywhere else.
        </p>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}
