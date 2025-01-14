export type Chat = {
  role: "assistant" | "user";
  text: string;
};

export type DiaryThread = {
  threadId: string;
  createdAt: number;
};

export type AssistantEvents =
  | "thread.run.created"
  | "thread.run.queued"
  | "thread.run.in_progress"
  | "thread.run.step.created"
  | "thread.run.step.in_progress"
  | "thread.message.created"
  | "thread.message.in_progress"
  | "thread.message.delta"
  | "thread.message.completed"
  | "thread.run.step.completed"
  | "thread.run.completed"
  | "done";
