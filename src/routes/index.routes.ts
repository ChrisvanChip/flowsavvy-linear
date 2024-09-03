import { Request, Response, Router } from 'express';
import FlowSavvy from "../classes/FlowSavvy";
import crypto from "crypto";
import FormData from 'form-data';
import dotenv from "dotenv";
import assert from "node:assert";
import Task from "../classes/Task";

dotenv.config()
assert(process.env.SIGNING_SECRET, '[env variables] SIGNING_SECRET is required')
assert(process.env.FULL_NAME, '[env variables] FULL_NAME is required')
assert(process.env.ESTIMATION_POINT_IN_MINUTES, '[env variables] ESTIMATION_POINT_IN_MINUTES is required')

const Client = new FlowSavvy();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
    res.json({
        status: 'success',
        message: 'Use this URL as Linear webhook to sync with FlowSavvy.',
        author: '@ChrisvanChip',
    });
});

// Actual webhook endpoint – this is where the magic happens ✨
router.post('/', (req: Request, res: Response) => {
    let body = req.body;
    if (!body || !body.data || !body.data.identifier) {
        res.json({
            status: 'error',
            message: 'No data provided.'
        });
        return;
    }
    body = body.data;

    let tokens = process.env.SIGNING_SECRET!.split(";")
    let valid = false
    if (process.env.SIGNING_SECRET == 'DEV') {
        valid = true
    }
    tokens.forEach(function (token) {
        const signature = crypto.createHmac("sha256", token).update(req.rawBody).digest("hex");
        if (signature == req.headers['linear-signature']) {
            valid = true
        }
    })
    if (!valid) {
        throw "Invalid signature. SIGNING_SECRET failed."
    }

    const assignedToMe = body.assignee?.name === process.env.FULL_NAME;
    Client.searchTask(body.identifier).then(task => {
        if (task) {
            if (assignedToMe) {
                console.log(`[log] Update task ${task.id} from Linear issue ${body.identifier}`)

                let duration = Number(process.env.ESTIMATION_POINT_IN_MINUTES!);
                duration *= body.estimate || 1;
                task.DurationHours = Math.floor(duration / 60);
                task.DurationMinutes = duration % 60;
                task.Title = `${body.title} (${body.identifier})`;
                task.Notes = body.Description || "" + "\n\n" + body.url;
                task.DueDateTime = body.dueDate ? body.dueDate + 'T23:59:59' : null;
                task.EndDateTime = `2000-01-01T${task.DurationHours.toString().padStart(2, '0')}:${task.DurationMinutes.toString().padStart(2, '0')}:00`

                let formData = new FormData();
                for (let [key, value] of Object.entries(task)) {
                    if (value) formData.append(key, value.toString());
                }
                Client.request('POST', 'Item/Edit', formData, true, formData.getHeaders()).then((response) => {
                    void Client.forceRecalculate();
                    if (body.state.type === 'completed' || body.state.type === 'canceled') {
                        console.log(`[log] Mark task as completed in FlowSavvy: ${task.id}`)

                        let formData = new FormData();
                        formData.append('serializedItemIdToInstanceIdsDict', `{"${task.id}":[0]}`)
                        Client.request('POST', 'Item/ChangeTaskCompleteStatus', formData, true, formData.getHeaders()).then((response) => {

                        })
                    }
                })
            } else {
                console.log(`[log] Task assigned to someone else, so delete: ${task.id}`)

                let formData = new FormData();
                formData.append('serializedItemIdToInstanceIdsDict', `{"${task.id}":[0]}`)
                formData.append('deleteType', 'deleteAll')
                Client.request('POST', 'Item/MultipleDelete', formData, true, formData.getHeaders()).then((response) => {
                    void Client.forceRecalculate();
                })
            }
        } else {
            if (assignedToMe && body.state.type !== 'completed') {
                console.log(`[log] Create task in FlowSavvy from Linear issue ${body.identifier}`)

                let duration = Number(process.env.ESTIMATION_POINT_IN_MINUTES!);
                duration *= body.estimate || 1;

                let task = new Task(0, duration, `${body.title} (${body.identifier})`, body.description || "" + "\n\n" + body.url, body.dueDate);
                let formData = new FormData();
                for (let [key, value] of Object.entries(task)) {
                    if (value) formData.append(key, value.toString());
                }
                Client.request('POST', 'Item/Create', formData, true, formData.getHeaders()).then((response) => {
                    void Client.forceRecalculate();
                })
            }
        }
        res.sendStatus(200);
    }).catch(err => {
        console.error(err);
        res.sendStatus(500);
    });
})

export default router;