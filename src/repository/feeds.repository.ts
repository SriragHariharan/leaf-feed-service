import { IFeedRepository } from '../interfaces/IFeedRepository';
import { FeedItem, PaginatedTimeline } from '../interfaces/FeedItem.interface';
import createHttpError from 'http-errors';
import prisma from '../configs/prisma';

class FeedsRepository implements IFeedRepository {

    async getFeed(userID: string, page: number): Promise<FeedItem[]> {
        try {
            const pageSize = 5;
            const offset = (page - 1) * pageSize;

            const feed = await prisma.timeline.findMany({
                where: { userID },
                include: {
                    post: {
                        select: {
                            postID: true,
                            imageURL: true,
                            content: true,
                            createdAt: true,
                            owner: {
                                select: {
                                    userID: true,
                                    username: true,
                                    profilePic: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    post: {
                        createdAt: 'desc'
                    }
                },
                take: pageSize,
                skip: offset
            });

            return feed.map((entry) => ({
                id: entry.id,
                postID: entry.post.postID,
                imageURL: entry.post.imageURL,
                content: entry.post.content,
                createdAt: entry.post.createdAt,
                owner: {
                    userID: entry.post.owner.userID,
                    username: entry.post.owner.username,
                    profilePic: entry.post.owner.profilePic
                },
                isLiked: entry.isLiked,
                isCommented: entry.isCommented
            }));
        } catch (error) {
            console.error("Error fetching user feed:", error);
            throw createHttpError(500, "Failed to fetch feed");
        }
    }

    async toggleLike(postID: string, userID: string): Promise<boolean> {
        try {
            const timeline = await prisma.timeline.findFirst({
                where: {
                    postID,
                    userID,
                },
            });

            if (timeline) {
                const newIsLikedValue = !timeline.isLiked;

                await prisma.timeline.update({
                    where: { id: timeline.id },
                    data: { isLiked: newIsLikedValue },
                });

                console.log(`Timeline for postID ${postID} and userID ${userID} toggled isLiked to ${newIsLikedValue}.`);
                return true;
            } else {
                console.log(`Timeline for postID ${postID} and userID ${userID} not found.`);
                throw createHttpError(404, "Timeline entry not found");
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            throw createHttpError(500, "Unable to like post");
        }
    }

    async getUserTimeline(userID: string, page: number): Promise<PaginatedTimeline> {
        try {
            const limit = 3;
            const offset = (page - 1) * limit;

            const posts = await prisma.Post.findMany({
                where: { ownerID: userID },
                include: {
                    timelines: {
                        where: { userID },
                        select: {
                            isLiked: true,
                            isCommented: true,
                        },
                    },
                    owner: {
                        select: {
                            userID: true,
                            username: true,
                            profilePic: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
                skip: offset,
            });

            return posts;
        } catch (error) {
            console.error("Error fetching user timeline:", error);
            throw createHttpError(500, "Failed to fetch user timeline");
        }
    }
}

export default FeedsRepository;
