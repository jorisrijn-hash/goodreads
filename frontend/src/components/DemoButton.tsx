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
export function DemoButton({
  returnTo = "/home",
  label = "Explore demo account",
  size = "default",
}: {
  returnTo?: string;
  label?: string;
  size?: "default" | "large";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function enter() {
    setLoading(true);
    setFailed(false);
    try {
      await api.enterDemo();
      // No router.refresh() after the push: the destination is rendered fresh anyway, and
      // refreshing as well rendered it twice (and prefetched pages around it) before the
      // navigation could finish, about a second of avoidable wait on production.
      router.push(returnTo);
    } catch {
      setFailed(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <Button type="button" variant="quiet" size={size} loading={loading} onClick={enter}>
        {label}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-[var(--burgundy)]">
          The demo account is unavailable right now.
        </p>
      )}
    </div>
  );
}
