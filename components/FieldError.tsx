import type { ParsedFieldError } from "@/lib/parse-trpc-error";

interface FieldErrorProps {
  field: string;
  fieldErrors: readonly ParsedFieldError[];
}

export default function FieldError({ field, fieldErrors }: FieldErrorProps) {
  const messages = fieldErrors
    .filter((fieldError) => fieldError.field === field)
    .map((fieldError) => fieldError.message);

  if (messages.length === 0) return null;

  return (
    <div role="alert" className="mt-1 space-y-1 text-sm font-medium text-destructive">
      {messages.map((message, index) => (
        <p key={`${index}-${message}`}>{message}</p>
      ))}
    </div>
  );
}
