import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Spinner from "@/components/Spinner";
import type { Task } from "@/shared/task";

interface DeleteTaskDialogProps {
  task: Task | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteTaskDialog({
  task,
  isPending,
  onCancel,
  onConfirm,
}: DeleteTaskDialogProps) {
  return (
    <AlertDialog
      open={task !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
      }}
    >
      {task ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &apos;{task.title}&apos;?</AlertDialogTitle>
            <AlertDialogDescription>
              This task will be removed from your board. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={onConfirm}
            >
              {isPending ? <Spinner label="Deleting task" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
