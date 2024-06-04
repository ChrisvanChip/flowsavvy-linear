import express, {Express} from "express";
import router from "./routes";
import bodyParser from 'body-parser'

declare module 'http' {
    export interface IncomingMessage {
        rawBody: Buffer;
    }
}

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
}))
app.all("/", router);

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});