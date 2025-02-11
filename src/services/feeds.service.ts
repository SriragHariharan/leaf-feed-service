import createHttpError from "http-errors";
import { FeedItem, PaginatedTimeline } from "../interfaces/FeedItem.interface";
import { IFeedRepository } from "../interfaces/IFeedRepository";
import { IFeedService } from "../interfaces/IFeedService";

class FeedsService implements IFeedService {
    
    private feedsRepository: IFeedRepository;
    constructor(feedsRepository: IFeedRepository){
        this.feedsRepository = feedsRepository;
    }

    async getFeed(userID: string, page: number): Promise<FeedItem[]> {
        try {
            const feedsArray = await this.feedsRepository.getFeed(userID, page);
            return feedsArray;
        } catch (error) {
            throw createHttpError(500, "Unable to generate feed.")
        }
    }

    /* toggle isLiked to true or false */
    async toggleLike(postID: string, userID: string): Promise<boolean> {
        try {
            const response = await this.feedsRepository.toggleLike(postID, userID);
            return response;
        } catch (error) {
            throw createHttpError("Unable to add interaction");
        }
    }

    /* fetch timeline ie what all a user has posted */
    async getUserTimeline(userID: string, page: number): Promise<PaginatedTimeline> {
        try {
            const timeline = await this.feedsRepository.getUserTimeline(userID, page);
            return timeline;
        } catch (error) {
            throw createHttpError(500, "Unable to fetch timeline");
        }
    }
}

export default FeedsService;