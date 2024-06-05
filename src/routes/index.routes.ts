import {Request, Response, Router} from 'express';
import FlowSavvy from "../classes/FlowSavvy";
import crypto from "crypto";
import FormData from 'form-data';
import dotenv from "dotenv";
import assert from "node:assert";

dotenv.config()
assert(process.env.SIGNING_SECRET, '[env variables] SIGNING_SECRET is required')
assert(process.env.FULL_NAME, '[env variables] FULL_NAME is required')

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

    const signature = crypto.createHmac("sha256", process.env.SIGNING_SECRET!).update(req.rawBody).digest("hex");
    if (process.env.SIGNING_SECRET !== 'DEV' && signature !== req.headers['linear-signature']) {
        throw "Invalid signature"
    }

    const assignedToMe = body.assignee?.name === process.env.FULL_NAME;
    Client.searchTask(body.identifier).then(task => {
        if (task) {
            if (assignedToMe) {
                console.log(`[log] Update task in FlowSavvy: ${task.id}`);
                if (body.state.type === 'completed') {
                    console.log(`[log] Mark task as completed in FlowSavvy: ${task.id}`)

                    let formData = new FormData();
                    formData.append('serializedItemIdToInstanceIdsDict', `{"${task.id}":[0]}`)
                    Client.request('POST', 'Item/ChangeTaskCompleteStatus', formData, true, formData.getHeaders()).then((response) => {
                        console.log(response);
                    })
                }
            } else {
                console.log(`[log] Task assigned to someone else, so delete: ${task.id}`)

            }
        } else {
            if (assignedToMe && body.state.type !== 'completed') {
                console.log(`[log] Create task in FlowSavvy from Linear issue ${body.identifier}`)
            }
        }
        res.sendStatus(200);
    }).catch(err => {
        console.error(err);
        res.sendStatus(500);
    });
})

export default router;