import { FlowSavvy } from "./flowsavvy.ts";
import { syncIssue } from "./sync.ts";
import type { Env, QueuedIssue } from "./types.ts";

let client: FlowSavvy | undefined;

export async function processQueue(batch: MessageBatch<QueuedIssue>, env: Env) {
  for (const message of batch.messages) {
    const item = message.body;
    const base = {
      deliveryId: item.deliveryId,
      issue: item.issue.identifier,
      attempt: message.attempts,
    };

    try {
      const prior = await env.DB.prepare(
        "SELECT delivery_id, event_timestamp FROM linear_issue_sync WHERE issue_id = ?",
      )
        .bind(item.issue.id)
        .first<{ delivery_id: string; event_timestamp: number }>();
      if (
        prior &&
        (prior.delivery_id === item.deliveryId ||
          prior.event_timestamp >= item.eventTimestamp)
      ) {
        console.log(
          JSON.stringify({
            ...base,
            action: "ignore",
            result: "duplicate_or_stale",
          }),
        );
        message.ack();
        continue;
      }

      client ??= new FlowSavvy(env);
      const action = await syncIssue(
        client,
        item.issue,
        item.mapping,
        env.LINEAR_ASSIGNEE_NAME,
        Number(env.MINUTES_PER_POINT ?? 15),
        item.removed,
      );

      await env.DB.prepare(
        "INSERT INTO linear_issue_sync (issue_id, delivery_id, event_timestamp) VALUES (?, ?, ?) ON CONFLICT(issue_id) DO UPDATE SET delivery_id=excluded.delivery_id, event_timestamp=excluded.event_timestamp WHERE excluded.event_timestamp > linear_issue_sync.event_timestamp",
      )
        .bind(item.issue.id, item.deliveryId, item.eventTimestamp)
        .run();

      console.log(JSON.stringify({ ...base, action, result: "ok" }));
      message.ack();
    } catch (error) {
      console.error(
        JSON.stringify({
          ...base,
          action: "sync",
          result: "failed",
          upstreamStatus: error instanceof Error ? error.message : "unknown",
        }),
      );
      message.retry({ delaySeconds: 60 });
    }
  }
}
