![image](https://github.com/ChrisvanChip/flowsavvy-linear/assets/31969757/13ff3ab7-45b5-4019-bfc2-8e750d57eb22)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ChrisvanChip/flowsavvy-linear)

Recently, I discovered [FlowSavvy](https://flowsavvy.app), an automatic time-blocking tool. It schedules your tasks neatly around your events, ensuring a balanced workload, which works great!

However, creating tasks felt sluggish. I already use Linear for solo development, so after exactly 0 days of using FlowSavvy, I created an integration to lift this burden. If you are assigned to a Linear issue, FlowSavvy will automatically schedule it in the best spot in your schedule. Now, you've automated the automator!

**Breaking changes:** I've rewritten the project to work with Hono, so you no longer need an always-on server! For the legacy Express project, see [legacy](https://github.com/ChrisvanChip/flowsavvy-linear/tree/legacy).

## Deploy

The project is built to deploy on Cloudflare's services (Workers, Queues, D1). It's a vendor lock-in, but at least it's free ;)

Set these encrypted Worker secrets when prompted (or use `wrangler secret put NAME`):

- `FLOW_SAVVY_EMAIL`, `FLOW_SAVVY_PASSWORD`, `FLOW_SAVVY_TIME_ZONE`
- `LINEAR_ASSIGNEE_NAME` = your exact Linear display name
- `LINEAR_WEBHOOKS` = JSON array described below

Run `npm run migrate -- --remote` after provisioning the database.

In Linear, open **Workspace Settings → API → Webhooks**, create an Issue webhook pointing to the Worker URL, and use its signing secret in `LINEAR_WEBHOOKS`.

```json
[
  {
    "secret": "first-webhook-secret",
    "schedulingHoursId": 123,
    "taskListId": 456
  },
  { "secret": "second-webhook-secret", "schedulingHoursId": 789 }
]
```

Each webhook maps to a required FlowSavvy scheduling-hours profile and an optional task list. Find these numeric IDs in your browser's developer-tools network payload while changing a task's scheduling hours or list in FlowSavvy. You can use a separate Linear webhook/secret for each project mapping.

## Behavior

- Assigned active issue ➔ create or update a task.
- Assigned completed/canceled issue ➔ complete an existing task, if it exists.
- Unassigned or removed issue ➔ delete an existing task.

Linear receives a response after enqueueing, within its five-second deadline. The queue processes one message at a time, retries failures five times after 60 seconds, then moves them to `flowsavvy-linear-dlq`.

Cloudflare Queues' free tier currently permits 10,000 operations/day and 24-hour retention; a normal webhook uses about three operations.

## Local development

Requires Node 24+.

```sh
npm install
cp .dev.vars.example .dev.vars
npm run types
npm run migrate -- --local
npm run dev
```

Use `npm test`, `npm run typecheck`, or `npm run check` (tests, typecheck, and dry-run bundle). Local webhook signatures must cover the untouched JSON bytes and timestamps must be within one minute.

---

MIT licensed.
