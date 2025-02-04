import { Request, Response, NextFunction } from "express";
import { IFeedService } from "../interfaces/IFeedService";

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
}

export default FeedsController;