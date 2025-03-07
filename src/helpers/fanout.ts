import createHttpError from "http-errors";
import prisma from "../configs/prisma";
import logger from "./logger";

/* Fanout a post to multiple users by creating timeline entries for each user. */
async function fanoutService(friendIDs: string[], postID: string): Promise<void> {
  logger.debug(`Entering fanoutService method. Params: postID=${postID}, friendIDs=${friendIDs.length}`, { method: "fanoutService", layer: "service" });
  try {
    logger.info(`Fetching existing timeline entries for post. PostID: ${postID}`, { layer: "service" });

    // Using prisma.createMany for batch insertion instead of Promise.allSettled
    const existingEntries = await prisma.timeline.findMany({
      where: {
        userID: { in: friendIDs },
        postID: postID,
      },
      select: { userID: true },
    });

    const existingFriendIDs = new Set(existingEntries.map((entry) => entry.userID));

    logger.info(`Filtering out existing timeline entries. PostID: ${postID}`, { layer: "service" });

    const newTimelines = friendIDs
      .filter((friendID) => !existingFriendIDs.has(friendID))
      .map((friendID) => ({
        userID: friendID,
        postID: postID,
        isLiked: false,
        isCommented: false,
      }));

    if (newTimelines.length > 0) {
      logger.info(`Creating new timeline entries for ${newTimelines.length} friends. PostID: ${postID}`, { layer: "service" });

      await prisma.timeline.createMany({
        data: newTimelines,
        skipDuplicates: true, // Avoid duplicate insertions
      });

      logger.info(`Successfully created new timeline entries. PostID: ${postID}`, { layer: "service" });
      console.log(`Fanout completed for ${newTimelines.length} friends.`);
    } else {
      logger.info(`No new timelines to fanout. PostID: ${postID}`, { layer: "service" });
      console.log("No new timelines to fanout.");
    }
  } catch (error) {
    logger.error(`Error in fanoutService: Unable to fanout post. PostID: ${postID}`, { error, layer: "service" });
    throw createHttpError(500, `Unable to fanout the post with postID: ${postID}`);
  } finally {
    logger.debug(`Exiting fanoutService method. Params: postID=${postID}, friendIDs=${friendIDs.length}`, { method: "fanoutService", layer: "service" });
  }
}

export { fanoutService };