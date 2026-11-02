"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";

interface DeleteTaskButtonProps {
  taskId: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function DeleteTaskButton({ taskId, onDelete, isDeleting }: DeleteTaskButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <>
        <span>Delete?</span>
        <button
          type="button"
          onClick={() => {
            onDelete(taskId);
            setConfirming(false);
          }}
          disabled={isDeleting}
        >
          {isDeleting ? <Spinner label="Deleting" /> : "Delete"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={isDeleting}>
          Cancel
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      aria-label="Delete task"
      onClick={() => setConfirming(true)}
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner label="Deleting" /> : "🗑"}
    </button>
  );
}