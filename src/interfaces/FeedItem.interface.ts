export interface FeedItem {
    postID: string;
    imageURL: string;
    content: string;
    createdAt: Date;
    owner: {
        userID: string;
        username: string;
        profilePic?: string;
    };
    isLiked: boolean;
    isCommented: boolean;
}