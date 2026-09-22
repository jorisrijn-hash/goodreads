import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * /login and /signup share this layout, so switching between them keeps the scene and
 * the page in place and only the form panel changes. The URLs are unchanged.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
