import express,  { NextFunction, Request, Response } from 'express';
import 'dotenv/config'
import createHttpError from 'http-errors';
import bodyParser from 'body-parser';

/* Rabbit MQ */
import "./messaging/rabbitmq/consumer";
import { sequelize } from './configs/sequelize/models.sequelize';
import feedsRouter from './routes/feed.routes';

const app = express();

/* logger logs handling */
app.use((_req: Request, _res: Response, next: NextFunction) => {
//   logger.info(`Incoming request`, { method: req.method, url: req.url });
  next();
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use("/", feedsRouter);


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

/* connect to cockroach DB & run express server */
sequelize.sync()
  .then(() => {
    console.log('💡 Tables created & Connected to database...💡');
    app.listen(process.env.PORT, () => console.log("server running at " + process.env.PORT))
  })
  .catch((err: any) => {
    console.error('Error syncing database: ', err);
    process.exit(1);
  });
