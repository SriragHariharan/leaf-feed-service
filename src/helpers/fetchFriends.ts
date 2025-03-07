import axios from 'axios';
import { signAccessToken } from './jwt.helper';
import logger from './logger';

/* Fetch the list of friend IDs for a user, including the user's own ID. */
async function fetchFriendID(ownerID: string): Promise<any> {
    logger.debug(`Entering fetchFriendID method. Param: ownerID=${ownerID}`, { method: "fetchFriendID", layer: "helper" });
    try {
        logger.info(`Fetching friend IDs for user. OwnerID: ${ownerID}`, { layer: "helper" });

        const accessToken = signAccessToken(ownerID);

        logger.info(`Making API request to fetch friend IDs. OwnerID: ${ownerID}`, { layer: "helper" });

        const response = await axios.get(process.env.FRIEND_ID_FETCH_URL!, {
            headers: {
                Authorization: `Bearer ${accessToken}`, // Set the Bearer token in the header
            },
        });

        logger.info(`Successfully fetched friend IDs. OwnerID: ${ownerID}`, { layer: "helper" });
        console.log(response?.data?.data?.friendIDs, " ::: response from friend id fetch");

        return [...response?.data?.data?.friendIDs, ownerID];
    } catch (error) {
        logger.error(`Error in fetchFriendID: Unable to fetch friend IDs for user. OwnerID: ${ownerID}`, { error, layer: "helper" });
        throw error; // Rethrow the error for further handling
    } finally {
        logger.debug(`Exiting fetchFriendID method. Param: ownerID=${ownerID}`, { method: "fetchFriendID", layer: "helper" });
    }
}

export default fetchFriendID;