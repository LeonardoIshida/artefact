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
  duration = 5000,
  onDismiss,
  onRetry,
}: TransientMessageProps) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const onDismissRef = useRef(onDismiss);
  const dismissRef = useRef<() => void>(() => {});
  const pauseTimerRef = useRef<() => void>(() => {});
  const resumeTimerRef = useRef<() => void>(() => {});
  const isHoveredRef = useRef(false);
  const isFocusedRef = useRef(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const visible = dismissedMessage !== message;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    let remaining = duration;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dismissed = false;
    let paused = isHoveredRef.current || isFocusedRef.current;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      setDismissedMessage(message);
      onDismissRef.current?.();
    };

    const startTimer = () => {
      if (dismissed || paused || timer !== undefined) return;
      startedAt = Date.now();
      timer = setTimeout(dismiss, remaining);
    };

    pauseTimerRef.current = () => {
      paused = true;
      if (dismissed || timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };
    resumeTimerRef.current = () => {
      paused = false;
      startTimer();
    };
    dismissRef.current = dismiss;
    if (!paused) startTimer();

    const dismissOnOutsideAction = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && regionRef.current?.contains(target)) return;
      dismiss();
    };

    window.addEventListener("click", dismissOnOutsideAction);
    window.addEventListener("keydown", dismissOnOutsideAction);

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener("click", dismissOnOutsideAction);
      window.removeEventListener("keydown", dismissOnOutsideAction);
      pauseTimerRef.current = () => {};
      resumeTimerRef.current = () => {};
      dismissRef.current = () => {};
    };
  }, [duration, message]);

  if (!visible) return null;

  return (
    <div
      ref={regionRef}
      onMouseEnter={() => {
        isHoveredRef.current = true;
        pauseTimerRef.current();
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
        if (!isFocusedRef.current) resumeTimerRef.current();
      }}
      onFocusCapture={() => {
        isFocusedRef.current = true;
        pauseTimerRef.current();
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          isFocusedRef.current = false;
          if (!isHoveredRef.current) resumeTimerRef.current();
        }
      }}
    >
      <StatusBanner
        kind={kind}
        message={message}
        onRetry={
          onRetry
            ? () => {
                onRetry();
                dismissRef.current();
              }
            : undefined
        }
        onDismiss={() => dismissRef.current()}
      />
    </div>
  );
}
