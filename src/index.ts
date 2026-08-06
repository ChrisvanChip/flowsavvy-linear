import { processQueue } from "./queue.ts";
import { webhook } from "./webhook.ts";

export type { Env, QueuedIssue } from "./types.ts";

export default {
  fetch: webhook.fetch,
  queue: processQueue,
};
