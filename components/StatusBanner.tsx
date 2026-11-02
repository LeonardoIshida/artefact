interface StatusBannerProps {
  kind: "success" | "error";
  message: string;
  onRetry?: () => void;
}

export default function StatusBanner({ kind, message, onRetry }: StatusBannerProps) {
  const role = kind === "error" ? "alert" : "status";
  return (
    <div role={role} data-kind={kind}>
      {message}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}