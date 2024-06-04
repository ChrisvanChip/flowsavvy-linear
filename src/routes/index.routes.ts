import {Request, Response, Router} from 'express';
import FlowSavvy from "../classes/FlowSavvy";

const Client = new FlowSavvy();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
    res.json({
        status: 'success',
        message: 'Use this URL as Linear webhook to sync with FlowSavvy.',
        author: '@ChrisvanChip',
    });
    console.log(await Client.isAuthenticated());
});

router.post('/', (req: Request, res: Response) => {
    let body = req.body;
    if (!body.data) {
        res.json({
            status: 'error',
            message: 'No data provided.'
        });
        return;
    }
    body = body.data;
    console.log(body);
})

export default router;