import { Hono } from "hono";
import type { Env, Issue, Mapping } from "./types.ts";

const encoder = new TextEncoder();

export async function validSignature(
  body: ArrayBuffer,
  signature: string,
  secret: string,
) {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(signature.match(/../g)!, (byte) =>
      Number.parseInt(byte, 16),
    ),
    body,
  );
}

export function parseMappings(value: string): Mapping[] {
  const mappings: unknown = JSON.parse(value);

  if (!Array.isArray(mappings) || !mappings.length) {
    throw new Error("LINEAR_WEBHOOKS must be a non-empty array");
  }

  return mappings.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid LINEAR_WEBHOOKS entry");
    }

    const { secret, schedulingHoursId, taskListId } = entry as Record<
      string,
      unknown
    >;
    if (
      typeof secret !== "string" ||
      !secret ||
      !Number.isInteger(schedulingHoursId) ||
      (taskListId !== undefined && !Number.isInteger(taskListId))
    ) {
      throw new Error(
        "Each webhook needs secret, integer schedulingHoursId, and optional integer taskListId",
      );
    }

    return {
      secret,
      schedulingHoursId: schedulingHoursId as number,
      ...(taskListId === undefined ? {} : { taskListId: taskListId as number }),
    };
  });
}

function isIssue(value: unknown): value is Issue {
  if (!value || typeof value !== "object") return false;

  const issue = value as Record<string, unknown>;
  return (
    typeof issue.id === "string" &&
    typeof issue.identifier === "string" &&
    typeof issue.title === "string" &&
    typeof issue.url === "string" &&
    !!issue.state &&
    typeof issue.state === "object" &&
    typeof (issue.state as Record<string, unknown>).type === "string"
  );
}

export const webhook = new Hono<{ Bindings: Env }>();

webhook.get("/", (c) => c.json({ status: "ok" }));
webhook.post("/", async (c) => {
  const raw = await c.req.arrayBuffer();
  let payload: Record<string, unknown>;
  let mappings: Mapping[];

  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as Record<
      string,
      unknown
    >;
    mappings = parseMappings(c.env.LINEAR_WEBHOOKS);
  } catch {
    return c.json({ error: "invalid request" }, 400);
  }

  if (!isIssue(payload.data)) return c.json({ error: "invalid issue" }, 400);

  const timestamp = Number(payload.webhookTimestamp);

  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) > 60_000
  ) {
    return c.json({ error: "stale request" }, 401);
  }

  const signature = c.req.header("linear-signature") ?? "";
  let mapping: Mapping | undefined;

  for (const candidate of mappings)
    if (await validSignature(raw, signature, candidate.secret)) {
      mapping = candidate;
      break;
    }

  if (!mapping) return c.json({ error: "invalid signature" }, 401);

  const deliveryId =
    c.req.header("linear-delivery") ??
    (typeof payload.webhookId === "string" ? payload.webhookId : "");
  if (!deliveryId) return c.json({ error: "missing delivery id" }, 400);

  try {
    await c.env.WEBHOOK_QUEUE.send({
      issue: payload.data,
      mapping,
      deliveryId,
      eventTimestamp: timestamp,
      removed: payload.action === "remove",
    });
    console.log(
      JSON.stringify({
        deliveryId,
        issue: payload.data.identifier,
        action: "enqueue",
        result: "ok",
      }),
    );
    return c.body(null, 200);
  } catch {
    console.error(
      JSON.stringify({
        deliveryId,
        issue: payload.data.identifier,
        action: "enqueue",
        result: "failed",
      }),
    );
    return c.json({ error: "queue unavailable" }, 503);
  }
});
