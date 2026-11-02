"use client";

import { useEffect, useRef, useState } from "react";
import StatusBanner from "@/components/StatusBanner";

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

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      setVisible(false);
      onDismissRef.current?.();
    };

    const timer = setTimeout(dismiss, duration);

    // Dismiss on interaction so stale feedback does not obscure the next action.
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

  return <StatusBanner kind={kind} message={message} onRetry={onRetry} />;
}
