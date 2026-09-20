"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "./Button";

/**
 * One click into a populated account.
 *
 * There is no demo password to share, and deliberately so — a real credential that
 * works from anywhere would inevitably leak. The server authenticates a known
 * `is_demo` identity instead.
 */
export function DemoButton({ returnTo = "/home" }: { returnTo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function enter() {
    setLoading(true);
    setFailed(false);
    try {
      await api.enterDemo();
      router.push(returnTo);
      router.refresh();
    } catch {
      setFailed(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <Button type="button" variant="quiet" loading={loading} onClick={enter}>
        Explore demo account
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-[var(--burgundy)]">
          The demo account is unavailable right now.
        </p>
      )}
    </div>
  );
}
