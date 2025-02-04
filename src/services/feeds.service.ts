import createHttpError from "http-errors";
import { FeedItem } from "../interfaces/FeedItem.interface";
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
}

export default FeedsService;