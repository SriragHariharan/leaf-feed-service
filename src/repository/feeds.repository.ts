import { IFeedRepository } from '../interfaces/IFeedRepository';
import { Post, User, Timeline } from '../configs/sequelize/models.sequelize';
import { FeedItem, PaginatedTimeline } from '../interfaces/FeedItem.interface';
import createHttpError from 'http-errors';

class FeedsRepository implements IFeedRepository {

    async getFeed(userID: string, page: number): Promise<FeedItem[]> {
        try {
            const pageSize = 5;
            const offset = (page - 1) * pageSize;

            const feed = await Timeline.findAll({
                where: { userID },
                include: [
                    {
                        model: Post,
                        attributes: ['postID', 'imageURL', 'content', 'createdAt'],
                        include: [{
                            model: User,
                            attributes: ['userID', 'username', 'profilePic']
                        }]
                    }
                ],
                attributes: ['id', 'isLiked', 'isCommented'], // Include 'id' here
                order: [['createdAt', 'DESC']],
                limit: pageSize,
                offset
            });

            return feed.map((entry: any) => ({
                id: entry.id, // This is the Timeline id
                postID: entry.Post.postID,
                imageURL: entry.Post.imageURL,
                content: entry.Post.content,
                createdAt: entry.Post.createdAt,
                owner: {
                    userID: entry.Post.User.userID,
                    username: entry.Post.User.username,
                    profilePic: entry.Post.User.profilePic
                },
                isLiked: entry.isLiked,
                isCommented: entry.isCommented
            }));
        } catch (error) {
            console.error("Error fetching user feed:", error);
            throw new Error("Failed to fetch feed");
        }
    }

    async toggleLike(postID: string, userID: string): Promise<boolean> {
        try {
            // Find the timeline entry based on postID and userID
            const timeline = await Timeline.findOne({
                where: {
                    postID,
                    userID,
                },
            });

            if (timeline) {
                // Toggle the isLiked value
                const newIsLikedValue = !timeline.isLiked;

                // Update the timeline entry
                await timeline.update({ isLiked: newIsLikedValue });

                console.log(`Timeline for postID ${postID} and userID ${userID} toggled isLiked to ${newIsLikedValue}.`);
                return true;
            } else {
                console.log(`Timeline for postID ${postID} and userID ${userID} not found.`);
                throw createHttpError("Timeline entry not found");
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            throw createHttpError("Unable to like post");
        }
    }

    /* get user timeline ie what all a user has posted */
    async getUserTimeline(userID: string, page: number): Promise<PaginatedTimeline> {
        try {
            const limit = 3;
            const offset = (page - 1) * limit;

            const posts = await Post.findAll({
                where: { ownerID: userID },
                include: [
                    {
                        model: Timeline,
                        required: true,
                        where: { userID },
                        attributes: ["isLiked", "isCommented"],
                    },
                    {
                        model: User,
                        required: true,
                        where: { userID },
                        attributes: ["userID", "username", "profilePic"],
                    },
                ],
                limit,
                offset,
                order: [['createdAt', 'DESC']], // Fetch latest posts first
            });

            return posts;
        } catch (error) {
            console.error("Error fetching user timeline:", error);
            throw new Error("Failed to fetch user timeline");
        }
    }
}

export default FeedsRepository;
