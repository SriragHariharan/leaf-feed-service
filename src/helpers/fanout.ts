import createHttpError from "http-errors";
import prisma from "../configs/prisma";

async function fanoutService(friendIDs: string[], postID: string): Promise<void> {
  try {
    // Using prisma.createMany for batch insertion instead of Promise.allSettled
    const existingEntries = await prisma.timeline.findMany({
      where: {
        userID: { in: friendIDs },
        postID: postID,
      },
      select: { userID: true },
    });

    const existingFriendIDs = new Set(existingEntries.map((entry) => entry.userID));

    const newTimelines = friendIDs
      .filter((friendID) => !existingFriendIDs.has(friendID))
      .map((friendID) => ({
        userID: friendID,
        postID: postID,
        isLiked: false,
        isCommented: false,
      }));

    if (newTimelines.length > 0) {
      await prisma.timeline.createMany({
        data: newTimelines,
        skipDuplicates: true, // Avoid duplicate insertions
      });
      console.log(`Fanout completed for ${newTimelines.length} friends.`);
    } else {
      console.log("No new timelines to fanout.");
    }
  } catch (error) {
    console.error(error);
    throw createHttpError(500, `Unable to fanout the post with postID: ${postID}`);
  }
}

export { fanoutService };
