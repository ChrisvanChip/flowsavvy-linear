import {Request, Response, Router} from 'express';
import FlowSavvy from "../classes/FlowSavvy";
import crypto from "crypto";

import dotenv from "dotenv";
import assert from "node:assert";

dotenv.config()
assert(process.env.SIGNING_SECRET, 'SIGNING_SECRET is required')

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
    if (!body || !body.data) {
        res.json({
            status: 'error',
            message: 'No data provided.'
        });
        return;
    }
    body = body.data;

    const signature = crypto.createHmac("sha256", process.env.SIGNING_SECRET!).update(req.rawBody).digest("hex");
    if (signature !== req.headers['linear-signature']) {
        throw "Invalid signature"
    }

    // Validated and ready to go
    Client.searchTask(body.identifier).then(task => {
        if (task) {
            console.log(task)
            res.send(task)
        } else {
            res.json({
                status: 'error',
                message: 'Task not found.'
            });
        }
    })
})

export default router;