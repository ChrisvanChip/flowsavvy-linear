export interface Mapping {
  secret: string;
  schedulingHoursId: number;
  taskListId?: number;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  description?: string | null;
  dueDate?: string | null;
  estimate?: number | null;
  assignee?: { name?: string | null } | null;
  state: { type: string };
}

export interface Env {
  FLOW_SAVVY_EMAIL: string;
  FLOW_SAVVY_PASSWORD: string;
  FLOW_SAVVY_TIME_ZONE: string;
  LINEAR_ASSIGNEE_NAME: string;
  LINEAR_WEBHOOKS: string;
  MINUTES_PER_POINT?: string;
  WEBHOOK_QUEUE: Queue<QueuedIssue>;
  DB: D1Database;
}

export interface QueuedIssue {
  issue: Issue;
  mapping: Mapping;
  deliveryId: string;
  eventTimestamp: number;
  removed: boolean;
}

export type FlowSavvyEnv = Pick<
  Env,
  "FLOW_SAVVY_EMAIL" | "FLOW_SAVVY_PASSWORD" | "FLOW_SAVVY_TIME_ZONE"
>;
