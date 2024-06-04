import {Router} from 'express';
import indexRouter from './index.routes';

// Create a new Router instance
const router = Router();

// Mount the routers
router.use('/', indexRouter);

export default router;