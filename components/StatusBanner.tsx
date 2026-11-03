import { CircleAlert, CircleCheck, X } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusBannerProps {
  kind: "success" | "error";
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function StatusBanner({
  kind,
  message,
  onRetry,
  onDismiss,
}: StatusBannerProps) {
  const role = kind === "error" ? "alert" : "status";
  const hasActions = onRetry !== undefined || onDismiss !== undefined;

  return (
    <Alert
      role={role}
      aria-live={kind === "error" ? "assertive" : "polite"}
      data-kind={kind}
      variant={kind === "error" ? "destructive" : "default"}
      className={cn(
        kind === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950",
        onRetry && onDismiss && "pr-24",
      )}
    >
      {kind === "error" ? (
        <CircleAlert aria-hidden="true" className="text-destructive" />
      ) : (
        <CircleCheck aria-hidden="true" className="text-emerald-700" />
      )}
      <AlertDescription
        className={kind === "success" ? "text-emerald-900" : undefined}
      >
        {message}
      </AlertDescription>
      {hasActions ? (
        <AlertAction className="top-1/2 -translate-y-1/2 flex items-center gap-1">
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Dismiss message"
              onClick={onDismiss}
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
