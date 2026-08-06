import assert from "node:assert/strict";
import test from "node:test";
import { decide, taskFields } from "../src/sync.ts";
import type { Issue } from "../src/types.ts";
import { parseMappings, validSignature } from "../src/webhook.ts";

const issue: Issue = {
  id: "id",
  identifier: "ENG-1",
  title: "Fix it",
  description: "Details",
  url: "https://linear.app/ENG-1",
  estimate: 0,
  dueDate: "2026-08-07",
  assignee: { name: "Chris" },
  state: { type: "started" },
};

test("sync decisions cover lifecycle without creating finished work", () => {
  assert.equal(decide(issue, true, false), "create");
  assert.equal(decide(issue, true, true), "update");
  assert.equal(
    decide({ ...issue, state: { type: "completed" } }, true, true),
    "complete",
  );
  assert.equal(
    decide({ ...issue, state: { type: "canceled" } }, true, false),
    "none",
  );
  assert.equal(decide(issue, false, true), "delete");
  assert.equal(decide(issue, true, true, true), "delete");
});

test("task serialization preserves zero estimates, notes, due date, and mapping", () => {
  const fields = taskFields(
    issue,
    { secret: "hidden", schedulingHoursId: 123, taskListId: 456 },
    15,
  );
  assert.equal(fields.DurationMinutes, "0");
  assert.equal(fields.Notes, "Details\n\nhttps://linear.app/ENG-1");
  assert.equal(fields.DueDateTime, "2026-08-07T23:59:59");
  assert.equal(fields.timeProfileId, "123");
  assert.equal(fields.taskListId, "456");
  assert.equal("secret" in fields, false);
});

test("mapping validation accepts valid mappings and rejects incomplete ones", () => {
  assert.deepEqual(parseMappings('[{"secret":"s","schedulingHoursId":1}]'), [
    { secret: "s", schedulingHoursId: 1 },
  ]);
  assert.throws(() => parseMappings('[{"secret":"s"}]'));
});

test("signature validation accepts matching Web Crypto signatures", async () => {
  const body = new TextEncoder().encode("hello");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = [
    ...new Uint8Array(await crypto.subtle.sign("HMAC", key, body)),
  ]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  assert.equal(await validSignature(body.buffer, signature, "secret"), true);
  assert.equal(await validSignature(body.buffer, "bad", "secret"), false);
});
