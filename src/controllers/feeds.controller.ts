import { Request, Response, NextFunction } from "express";
import { IFeedService } from "../interfaces/IFeedService";
import createHttpError from "http-errors";

class FeedsController {

    private feedService: IFeedService;
    constructor(feedService: IFeedService){
        this.feedService = feedService;
    }
    
    /* get feeds */
    async getFeed(req: Request, res: Response, next: NextFunction){
        try {
            const userID = req.user?.aud;
            const page = Number(req.params?.page) ?? 1;
            const feeds = await this.feedService.getFeed(userID, page);
            return res.status(200).json({ success: true, message: null, data: { feeds }});
        } catch (error) {
            next(error);
        }
    }

    /* update isLiked status(toggle value to true/false) */
    async toggleLike(req: Request, res: Response, next: NextFunction){
        try {
            const postID = req.params.postID;
            const userID = req.user?.aud;
            if(!postID){
                throw createHttpError(404, "Post not found");
            }
            const response = await this.feedService.toggleLike(postID, userID); 
            if(!response) throw createHttpError("Unable to add interaction");
            return res.status(200).json({ success: true, message: "Interaction added", data: null });
        } catch (error) {
            next(error);
        }
    }
}

export default FeedsController;