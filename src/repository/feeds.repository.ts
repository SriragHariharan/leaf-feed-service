import { IFeedRepository } from '../interfaces/IFeedRepository';
import { FeedItem, PaginatedTimeline } from '../interfaces/FeedItem.interface';
import createHttpError from 'http-errors';
import prisma from '../configs/prisma';
import logger from '../helpers/logger';

class FeedsRepository implements IFeedRepository {

    /* Fetch a paginated feed for a user. */
    async getFeed(userID: string, page: number): Promise<FeedItem[]> {
        logger.debug(`Entering getFeed method. Params: userID=${userID}, page=${page}`, { method: "getFeed", layer: "repository" });
        try {
            const pageSize = 5;
            const offset = (page - 1) * pageSize;

            logger.info(`Fetching feed for user. UserID: ${userID}, Page: ${page}`, { layer: "repository" });

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

            logger.info(`Successfully fetched feed for user. UserID: ${userID}, Page: ${page}`, { layer: "repository" });

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
            logger.error(`Error in getFeed: Failed to fetch feed for user. UserID: ${userID}`, { error, layer: "repository" });
            throw createHttpError(500, "Failed to fetch feed");
        } finally {
            logger.debug(`Exiting getFeed method. Params: userID=${userID}, page=${page}`, { method: "getFeed", layer: "repository" });
        }
    }

    /* Toggle the "like" status of a post for a user. */
    async toggleLike(postID: string, userID: string): Promise<boolean> {
        logger.debug(`Entering toggleLike method. Params: postID=${postID}, userID=${userID}`, { method: "toggleLike", layer: "repository" });
        try {
            logger.info(`Fetching timeline entry for post. PostID: ${postID}, UserID: ${userID}`, { layer: "repository" });

            const timeline = await prisma.timeline.findFirst({
                where: {
                    postID,
                    userID,
                },
            });

            if (timeline) {
                const newIsLikedValue = !timeline.isLiked;

                logger.info(`Toggling like status for post. PostID: ${postID}, UserID: ${userID}, NewIsLiked: ${newIsLikedValue}`, { layer: "repository" });

                await prisma.timeline.update({
                    where: { id: timeline.id },
                    data: { isLiked: newIsLikedValue },
                });

                logger.info(`Successfully toggled like status for post. PostID: ${postID}, UserID: ${userID}`, { layer: "repository" });
                return true;
            } else {
                logger.error(`Timeline entry not found. PostID: ${postID}, UserID: ${userID}`, { layer: "repository" });
                throw createHttpError(404, "Timeline entry not found");
            }
        } catch (error) {
            logger.error(`Error in toggleLike: Unable to like post. PostID: ${postID}, UserID: ${userID}`, { error, layer: "repository" });
            throw createHttpError(500, "Unable to like post");
        } finally {
            logger.debug(`Exiting toggleLike method. Params: postID=${postID}, userID=${userID}`, { method: "toggleLike", layer: "repository" });
        }
    }

    /* Fetch a paginated timeline for a user. */
    async getUserTimeline(userID: string, page: number): Promise<PaginatedTimeline> {
        logger.debug(`Entering getUserTimeline method. Params: userID=${userID}, page=${page}`, { method: "getUserTimeline", layer: "repository" });
        try {
            const limit = 3;
            const offset = (page - 1) * limit;

            logger.info(`Fetching timeline for user. UserID: ${userID}, Page: ${page}`, { layer: "repository" });

            const posts = await prisma.post.findMany({
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

            logger.info(`Successfully fetched timeline for user. UserID: ${userID}, Page: ${page}`, { layer: "repository" });
            return posts;
        } catch (error) {
            logger.error(`Error in getUserTimeline: Failed to fetch user timeline. UserID: ${userID}`, { error, layer: "repository" });
            throw createHttpError(500, "Failed to fetch user timeline");
        } finally {
            logger.debug(`Exiting getUserTimeline method. Params: userID=${userID}, page=${page}`, { method: "getUserTimeline", layer: "repository" });
        }
    }
}

export default FeedsRepository;