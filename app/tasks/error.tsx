"use client";

import { CircleAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TasksErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function TasksError({ retry }: TasksErrorProps) {
  return (
    <Alert role="alert" aria-live="assertive" variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Could not load tasks</AlertTitle>
      <AlertDescription>
        There was a problem loading this page. Please try again.
      </AlertDescription>
      <Button type="button" variant="outline" onClick={retry}>
        Try again
      </Button>
    </Alert>
  );
}
