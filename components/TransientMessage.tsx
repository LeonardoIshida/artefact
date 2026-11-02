"use client";

import { useEffect, useRef, useState } from "react";

interface TransientMessageProps {
  message: string;
  kind?: "success" | "error";
  duration?: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function TransientMessage({
  message,
  kind = "success",
  duration = 3000,
  onDismiss,
  onRetry,
}: TransientMessageProps) {
  const [visible, setVisible] = useState(true);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      setVisible(false);
      onDismissRef.current?.();
    };

    const timer = setTimeout(dismiss, duration);

    // Dismiss on the next user action (click or key press).
    const handleAction = () => dismiss();
    window.addEventListener("click", handleAction, { once: true });
    window.addEventListener("keydown", handleAction, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleAction);
      window.removeEventListener("keydown", handleAction);
    };
  }, [duration, message]);

  if (!visible) return null;

  return (
    <div role={kind === "error" ? "alert" : "status"} data-kind={kind}>
      {message}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}