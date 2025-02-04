import createHttpError from "http-errors";
import { Timeline } from "../configs/sequelize/models.sequelize"; // Import the Timeline model

async function fanoutService(friendIDs: string[], postID: string): Promise<void> {
  try {
    await Promise.all(
      friendIDs.map(async (friendID) => {
        console.log("Fanout post to friend:", friendID);

        // Check if the entry already exists
        const existingEntry = await Timeline.findOne({
          where: { userID: friendID, postID },
        });

        if (!existingEntry) {
          // Insert if not exists, including required default values
          await Timeline.create({
            userID: friendID,
            postID,
            isLiked: false, // Default value
            isCommented: false, // Default value
          });

          console.log(`Post ${postID} added to timeline of user ${friendID}`);
        } else {
          console.log(`Post ${postID} already exists in timeline of user ${friendID}`);
        }
      })
    );
  } catch (error) {
    console.error(error);
    throw createHttpError(500, `Unable to fanout the post with postID: ${postID}`);
  }
}

export { fanoutService };
