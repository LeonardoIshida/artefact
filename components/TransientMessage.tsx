import { useEffect, useState } from "react";

interface TransientMessageProps {
  message: string;
  kind?: "success" | "error";
  duration?: number;
  onDismiss?: () => void;
}

export default function TransientMessage({
  message,
  kind = "success",
  duration = 3000,
  onDismiss,
}: TransientMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div role={kind === "error" ? "alert" : "status"} data-kind={kind}>
      {message}
    </div>
  );
}