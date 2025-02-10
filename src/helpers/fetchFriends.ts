import axios from 'axios';
import { signAccessToken } from './jwt.helper';

async function fetchFriendID(ownerID: string): Promise<any> {
    try {
        const accessToken = signAccessToken(ownerID)
        const response = await axios.get(process.env.FRIEND_ID_FETCH_URL!, {
            headers: {
                Authorization: `Bearer ${accessToken}`, // Set the Bearer token in the header
            },
        });
        console.log(response?.data?.data?.friendIDs, " ::: response from friend id fetch");
        return [...response?.data?.data?.friendIDs, ownerID]
    } catch (error) {
        console.error('Error fetching friend ID:', error);
        throw error; // Rethrow the error for further handling
    }
}

export default fetchFriendID;