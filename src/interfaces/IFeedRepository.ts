export interface IFeedRepository {
    getFeed(userID: string, page: number): Promise<any>;
    toggleLike(postID: string, userID: string): Promise<boolean>
}