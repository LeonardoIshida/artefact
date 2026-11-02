import { CircleAlert, CircleCheck } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface StatusBannerProps {
  kind: "success" | "error";
  message: string;
  onRetry?: () => void;
}

export default function StatusBanner({
  kind,
  message,
  onRetry,
}: StatusBannerProps) {
  const role = kind === "error" ? "alert" : "status";

  return (
    <Alert
      role={role}
      data-kind={kind}
      variant={kind === "error" ? "destructive" : "default"}
      className={
        kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : undefined
      }
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
      {onRetry ? (
        <AlertAction className="top-1/2 -translate-y-1/2">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
