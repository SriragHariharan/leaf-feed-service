import { IFeedRepository } from '../interfaces/IFeedRepository';
import { Post, User, Timeline } from '../configs/sequelize/models.sequelize';
import { FeedItem } from '../interfaces/FeedItem.interface';

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
                attributes: ['isLiked', 'isCommented'],
                order: [['createdAt', 'DESC']],
                limit: pageSize,
                offset
            });

            return feed.map((entry: any) => ({
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
}

export default FeedsRepository;
