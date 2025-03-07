import createHttpError from "http-errors";
import { FeedItem, PaginatedTimeline } from "../interfaces/FeedItem.interface";
import { IFeedRepository } from "../interfaces/IFeedRepository";
import { IFeedService } from "../interfaces/IFeedService";
import logger from "../helpers/logger";

class FeedsService implements IFeedService {
    private feedsRepository: IFeedRepository;

    constructor(feedsRepository: IFeedRepository) {
        this.feedsRepository = feedsRepository;
    }

    /* Fetch a paginated feed for a user. */
    async getFeed(userID: string, page: number): Promise<FeedItem[]> {
        logger.debug(`Entering getFeed method. Params: userID=${userID}, page=${page}`, { method: "getFeed", layer: "service" });
        try {
            logger.info(`Fetching feed for user. UserID: ${userID}, Page: ${page}`, { layer: "service" });

            const feedsArray = await this.feedsRepository.getFeed(userID, page);

            logger.info(`Successfully fetched feed for user. UserID: ${userID}, Page: ${page}`, { layer: "service" });
            return feedsArray;
        } catch (error) {
            logger.error(`Error in getFeed: Unable to generate feed for user. UserID: ${userID}`, { error, layer: "service" });
            throw createHttpError(500, "Unable to generate feed.");
        } finally {
            logger.debug(`Exiting getFeed method. Params: userID=${userID}, page=${page}`, { method: "getFeed", layer: "service" });
        }
    }

    /* Toggle the "like" status of a post for a user. */
    async toggleLike(postID: string, userID: string): Promise<boolean> {
        logger.debug(`Entering toggleLike method. Params: postID=${postID}, userID=${userID}`, { method: "toggleLike", layer: "service" });
        try {
            logger.info(`Toggling like status for post. PostID: ${postID}, UserID: ${userID}`, { layer: "service" });

            const response = await this.feedsRepository.toggleLike(postID, userID);

            logger.info(`Successfully toggled like status for post. PostID: ${postID}, UserID: ${userID}`, { layer: "service" });
            return response;
        } catch (error) {
            logger.error(`Error in toggleLike: Unable to add interaction for post. PostID: ${postID}, UserID: ${userID}`, { error, layer: "service" });
            throw createHttpError(500, "Unable to add interaction");
        } finally {
            logger.debug(`Exiting toggleLike method. Params: postID=${postID}, userID=${userID}`, { method: "toggleLike", layer: "service" });
        }
    }

    /* Fetch a paginated timeline of posts for a user. */
    async getUserTimeline(userID: string, page: number): Promise<PaginatedTimeline> {
        logger.debug(`Entering getUserTimeline method. Params: userID=${userID}, page=${page}`, { method: "getUserTimeline", layer: "service" });
        try {
            logger.info(`Fetching timeline for user. UserID: ${userID}, Page: ${page}`, { layer: "service" });

            const timeline = await this.feedsRepository.getUserTimeline(userID, page);

            logger.info(`Successfully fetched timeline for user. UserID: ${userID}, Page: ${page}`, { layer: "service" });
            return timeline;
        } catch (error) {
            logger.error(`Error in getUserTimeline: Unable to fetch timeline for user. UserID: ${userID}`, { error, layer: "service" });
            throw createHttpError(500, "Unable to fetch timeline");
        } finally {
            logger.debug(`Exiting getUserTimeline method. Params: userID=${userID}, page=${page}`, { method: "getUserTimeline", layer: "service" });
        }
    }
}

export default FeedsService;