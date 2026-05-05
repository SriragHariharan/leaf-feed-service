export interface Post {
    postID: string;
    imageURL: string | null;
    content: string;
    ownerID: string;
    createdAt: Date;
    timelines: {
        isLiked: boolean;
        isCommented: boolean;
    }[];
    owner: {
        userID: string;
        username: string;
        profilePic: string | null;
    };
}

export interface PaginatedTimeline {
    posts: Post[];
    currentPage: number;
    totalPages: number;
}