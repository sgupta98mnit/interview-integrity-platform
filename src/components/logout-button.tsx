"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className = "rounded border border-zinc-300 px-3 py-2 text-sm",
  label = "Start New Session",
}: LogoutButtonProps) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const onLogout = async () => {
    setPending(true);

    try {
      await fetch("/api/session/logout", {
        method: "POST",
      });
    } finally {
      router.push("/start");
      router.refresh();
      setPending(false);
    }
  };

  return (
    <button type="button" disabled={pending} onClick={onLogout} className={className}>
      {pending ? "Leaving..." : label}
    </button>
  );
}
