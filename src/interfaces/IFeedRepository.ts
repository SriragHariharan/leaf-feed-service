export interface IFeedRepository {
    getFeed(userID: string, page: number): Promise<any>;
}