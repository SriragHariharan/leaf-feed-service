import { FeedItem, PaginatedTimeline } from "./FeedItem.interface";

export interface IFeedService {
    getFeed(userID: string, page: number): Promise<FeedItem[]>
    toggleLike(postID: string, userID: string): Promise<boolean>
    getUserTimeline(userID: string, page: number): Promise<PaginatedTimeline>
}