"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Refreshes the page every few seconds, so contracts Claude adds appear on their own.
export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <span className="live" title="This page updates by itself">
      <span className="live-dot" /> Live
    </span>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt("Copy this:", value);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function ConfirmButton({ label, message, className = "btn" }: { label: string; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
