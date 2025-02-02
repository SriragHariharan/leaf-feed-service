import express,  { NextFunction, Request, Response } from 'express';
import 'dotenv/config'
import createHttpError from 'http-errors';
import bodyParser from 'body-parser';

const app = express();

/* logger logs handling */
app.use((_req: Request, _res: Response, next: NextFunction) => {
//   logger.info(`Incoming request`, { method: req.method, url: req.url });
  next();
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello from feed-service");
});


//handle endpoints not found: 404
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  next(createHttpError.NotFound("Route not found"))
})

//errors from controllers send via next(error) is catched by this.
app.use((err: any, _req:Request, res:Response, _next: NextFunction) => {
  res.status(err.status || 500)
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  })
})

app.listen(process.env.PORT, () => console.log("server running at " + process.env.PORT))