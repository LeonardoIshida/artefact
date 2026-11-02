import { Spinner as UiSpinner } from "@/components/ui/spinner";

interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label = "Loading" }: SpinnerProps) {
  return <UiSpinner aria-label={label} className="text-muted-foreground" />;
}
