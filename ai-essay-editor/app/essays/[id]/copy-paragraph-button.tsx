"use client";

import { useState } from "react";

type CopyParagraphButtonProps = {
  text: string;
  idleLabel?: string;
};

export default function CopyParagraphButton({
  text,
  idleLabel = "Copy",
}: CopyParagraphButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const label =
    status === "copied"
      ? "Copied"
      : status === "failed"
        ? "Failed"
        : idleLabel;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-accent px-2.5 py-1 text-xs font-medium text-secondary hover:bg-surface-strong"
    >
      {label}
    </button>
  );
}
