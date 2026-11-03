export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

export const TAG_COLORS = ["red", "orange", "amber", "green", "blue", "violet", "pink", "gray"] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export interface TaskTag {
  name: string;
  color: TagColor;
}

export const TAG_NAME_MAX_LENGTH = 20;
export const TAGS_MAX_COUNT = 5;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  tags: TaskTag[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  tags?: TaskTag[];
}

export interface ParsedCreateTaskInput {
  title: string;
  description: string | null;
  tags: TaskTag[];
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  tags: TaskTag[];
}
