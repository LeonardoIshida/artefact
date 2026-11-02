interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label}>
      <span aria-hidden="true">…</span>
    </span>
  );
}