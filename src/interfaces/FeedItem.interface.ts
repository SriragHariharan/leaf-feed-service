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

export interface PaginatedTimeline {
  posts: Array<{
    postID: string;
    imageURL: string;
    content: string;
    createdAt: Date;
    isLiked: boolean;
    isCommented: boolean;
    owner: {
      userID: string;
      username: string;
      profilePic?: string;
    };
  }>;
  currentPage: number;
  totalPages: number;
}