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

router.post('/', (req: Request, res: Response) => {
    console.log(req.body)
    let body = req.body;
    if (!body.data) {
        res.json({
            status: 'error',
            message: 'No data provided.'
        });
        return;
    }
    body = body.data;
    const signature = crypto.createHmac("sha256", process.env.SIGNING_SECRET!).update(req.body).digest("hex");
    if (signature !== req.headers['linear-signature']) {
        throw "Invalid signature"
    }
    console.log(body);
})

export default router;