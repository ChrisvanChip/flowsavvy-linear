import type { FlowSavvy } from "./flowsavvy.ts";
import type { Issue, Mapping } from "./types.ts";

const COMPLETED = new Set(["completed", "canceled"]);

type SyncAction = "create" | "update" | "complete" | "delete" | "none";

export function decide(
  issue: Issue,
  assigned: boolean,
  found: boolean,
  removed = false,
): SyncAction {
  if (removed || !assigned) return found ? "delete" : "none";
  if (COMPLETED.has(issue.state.type)) return found ? "complete" : "none";
  return found ? "update" : "create";
}

export function taskFields(
  issue: Issue,
  mapping: Mapping,
  minutesPerPoint: number,
  id = 0,
): Record<string, string> {
  const duration = Math.max(0, (issue.estimate ?? 1) * minutesPerPoint);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  return {
    id: String(id),
    instanceId: "0",
    Completed: "false",
    DurationHours: String(hours),
    DurationMinutes: String(minutes),
    priority: "1",
    BufferTimeBeforeHours: "0",
    BufferTimeBeforeMinutes: "0",
    BufferTimeAfterHours: "0",
    BufferTimeAfterMinutes: "0",
    ProgressHours: "0",
    ProgressMinutes: "0",
    AccessLevel: "2",
    DontStartUntil: "0001-01-01T00:00",
    MinLengthHours: "0",
    MinLengthMinutes: "10",
    AllDay: "false",
    FixedTime: "false",
    Busy: "true",
    ItemType: "task",
    Changed: "false",
    timeProfileId: String(mapping.schedulingHoursId),
    LastMovedUtc: "0001-01-01T00:00:00",
    StartDateTime: "2000-01-01T00:00:00",
    EndDateTime: `2000-01-01T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
    DueDateTime: issue.dueDate ? `${issue.dueDate}T23:59:59` : "",
    TimeZone: "Floating",
    isAutoIgnored: "false",
    RepeatType: "Never",
    Interval: "1",
    Sunday: "false",
    Monday: "false",
    Tuesday: "false",
    Wednesday: "false",
    Thursday: "false",
    Friday: "false",
    Saturday: "false",
    MonthlyType: "Each...",
    Dates: "",
    MonthOrdinal: "0",
    WeekDay: "0",
    EndRepeatType: "Never",
    NumOccurrences: "1",
    EndRepeatDate: "2024-06-12T00:00",
    Repeats: "false",
    Notes: `${issue.description ?? ""}\n\n${issue.url}`,
    Title: `${issue.title} (${issue.identifier})`,
    Location: "",
    ...(mapping.taskListId === undefined
      ? {}
      : { taskListId: String(mapping.taskListId) }),
  };
}

export async function syncIssue(
  client: FlowSavvy,
  issue: Issue,
  mapping: Mapping,
  assignee: string,
  minutesPerPoint: number,
  removed = false,
) {
  const task = await client.search(issue.identifier);
  const action = decide(
    issue,
    issue.assignee?.name === assignee,
    !!task,
    removed,
  );

  if (action === "create" || action === "update")
    await client.post(
      `Item/${action === "create" ? "Create" : "Edit"}`,
      taskFields(issue, mapping, minutesPerPoint, task?.id),
    );
  else if (action === "complete")
    await client.post("Item/ChangeTaskCompleteStatus", {
      serializedItemIdToInstanceIdsDict: `{"${task!.id}":[0]}`,
    });
  else if (action === "delete")
    await client.post("Item/MultipleDelete", {
      serializedItemIdToInstanceIdsDict: `{"${task!.id}":[0]}`,
      deleteType: "deleteAll",
    });

  if (action !== "none") await client.recalculate();
  return action;
}
