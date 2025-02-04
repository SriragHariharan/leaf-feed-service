import { Router, Request, Response, NextFunction } from "express";
import FeedsRepository from "../repository/feeds.repository";
import FeedsService from "../services/feeds.service";
import FeedsController from "../controllers/feeds.controller";
import { validateAccessToken } from "../helpers/jwt.helper";

const feedsRouter = Router();

/* DI */
const feedsRepository = new FeedsRepository();
const feedsService = new FeedsService(feedsRepository);
const feedsController = new FeedsController(feedsService);


/* get feed of a user */
feedsRouter.get("/:page",  validateAccessToken, (req: Request, res: Response, next: NextFunction) => {
    feedsController.getFeed(req, res, next);
});
export default feedsRouter;