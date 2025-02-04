import { FeedItem } from "./FeedItem.interface";

export interface IFeedService {
    getFeed(userID: string, page: number): Promise<FeedItem[]>
}