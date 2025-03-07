import { Request, Response, NextFunction } from "express";
import { IFeedService } from "../interfaces/IFeedService";
import createHttpError from "http-errors";
import logger from "../helpers/logger";

class FeedsController {
    private feedService: IFeedService;

    constructor(feedService: IFeedService) {
        this.feedService = feedService;
    }

    /* Fetch a paginated feed for the authenticated user. */
    async getFeed(req: Request, res: Response, next: NextFunction) {
        logger.debug(`Entering getFeed method. Params: userID=${req.user?.aud}, page=${req.params?.page}`, { method: "getFeed", layer: "controller" });
        try {
            const userID = req.user?.aud;
            const page = Number(req.params?.page) ?? 1;

            logger.info(`Fetching feed for user. UserID: ${userID}, Page: ${page}`, { layer: "controller" });

            const feeds = await this.feedService.getFeed(userID, page);

            logger.info(`Successfully fetched feed for user. UserID: ${userID}, Page: ${page}`, { layer: "controller" });
            return res.status(200).json({ success: true, message: null, data: { feeds } });
        } catch (error) {
            logger.error(`Error in getFeed: Unable to fetch feed for user. UserID: ${req.user?.aud}`, { error, layer: "controller" });
            next(error);
        } finally {
            logger.debug(`Exiting getFeed method. Params: userID=${req.user?.aud}, page=${req.params?.page}`, { method: "getFeed", layer: "controller" });
        }
    }

    /* Toggle the "like" status of a post for the authenticated user. */
    async toggleLike(req: Request, res: Response, next: NextFunction) {
        logger.debug(`Entering toggleLike method. Params: postID=${req.params.postID}, userID=${req.user?.aud}`, { method: "toggleLike", layer: "controller" });
        try {
            const postID = req.params.postID;
            const userID = req.user?.aud;

            if (!postID) {
                logger.error(`Post not found. PostID: ${postID}`, { layer: "controller" });
                throw createHttpError(404, "Post not found");
            }

            logger.info(`Toggling like status for post. PostID: ${postID}, UserID: ${userID}`, { layer: "controller" });

            const response = await this.feedService.toggleLike(postID, userID);

            if (!response) {
                logger.error(`Unable to add interaction. PostID: ${postID}, UserID: ${userID}`, { layer: "controller" });
                throw createHttpError(500, "Unable to add interaction");
            }

            logger.info(`Successfully toggled like status for post. PostID: ${postID}, UserID: ${userID}`, { layer: "controller" });
            return res.status(200).json({ success: true, message: "Interaction added", data: null });
        } catch (error) {
            logger.error(`Error in toggleLike: Unable to toggle like for post. PostID: ${req.params.postID}, UserID: ${req.user?.aud}`, { error, layer: "controller" });
            next(error);
        } finally {
            logger.debug(`Exiting toggleLike method. Params: postID=${req.params.postID}, userID=${req.user?.aud}`, { method: "toggleLike", layer: "controller" });
        }
    }

    /* Fetch a paginated timeline for a user (either the authenticated user or another user). */
    async getUsertimeline(req: Request, res: Response, next: NextFunction) {
        logger.debug(`Entering getUsertimeline method. Params: userID=${req.params?.userID}, page=${req.query?.page}`, { method: "getUsertimeline", layer: "controller" });
        try {
            const userID = req.params?.userID === 'self' ? req.user?.aud : req.params?.userID;
            const page = Number(req.query?.page);

            if (!userID) {
                logger.error(`User not found. UserID: ${userID}`, { layer: "controller" });
                throw createHttpError(404, "User not found");
            }

            logger.info(`Fetching timeline for user. UserID: ${userID}, Page: ${page}`, { layer: "controller" });

            const timeline = await this.feedService.getUserTimeline(userID, page);

            logger.info(`Successfully fetched timeline for user. UserID: ${userID}, Page: ${page}`, { layer: "controller" });
            return res.status(200).json({ success: true, message: "Timeline fetched", data: { timeline } });
        } catch (error) {
            logger.error(`Error in getUsertimeline: Unable to fetch timeline for user. UserID: ${req.params?.userID}`, { error, layer: "controller" });
            next(error);
        } finally {
            logger.debug(`Exiting getUsertimeline method. Params: userID=${req.params?.userID}, page=${req.query?.page}`, { method: "getUsertimeline", layer: "controller" });
        }
    }
}

export default FeedsController;