"use client";

import { useRouter, useSearchParams } from "next/navigation";
import TransientMessage from "@/components/TransientMessage";

export default function TaskSuccessNotice() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedback = searchParams.get("feedback");

  const message =
    feedback === "created"
      ? "Task created"
      : feedback === "updated"
        ? "Task updated"
        : null;

  if (message === null) return null;

  return (
    <TransientMessage
      message={message}
      onDismiss={() => router.replace("/tasks", { scroll: false })}
    />
  );
}
