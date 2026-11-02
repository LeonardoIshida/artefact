interface StatusBannerProps {
  kind: "success" | "error";
  message: string;
}

export default function StatusBanner({ kind, message }: StatusBannerProps) {
  const role = kind === "error" ? "alert" : "status";
  return (
    <div role={role} data-kind={kind}>
      {message}
    </div>
  );
}