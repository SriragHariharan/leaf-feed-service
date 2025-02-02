import logger from "../../helpers/logger";
import amqp, { Channel, Connection, Message } from "amqplib";
import { User } from "../../configs/sequelize/models.sequelize"; 

console.log("[console log] RabbitMQ server is listening...");

const EXCHANGE: string = "user_events_exchange";
const QUEUE: string = "feeds_service_queue";
const DLX_EXCHANGE: string = "user_events_dlx_exchange";
const DLX_QUEUE: string = "user_events_dlx_queue";
const MAX_RETRIES: number = 5;

interface UserData {
    userID: string;
    type: string;
    username?: string;
    profilePicture?: string | null;
}

async function getUserEvents(): Promise<void> {
    try {
        logger.info("[RabbitMQ] Initializing connection to RabbitMQ...");

        // Establish a TCP connection
        const connection: Connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_STRING!);
        logger.info("[RabbitMQ] Connection established successfully.");

        // Create a channel (communication line)
        const channel: Channel = await connection.createChannel();
        logger.info("[RabbitMQ] Channel created successfully.");

        // Create a main exchange (if not exists)
        await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
        logger.info(`[RabbitMQ] Exchange '${EXCHANGE}' asserted.`);

        // Create a DLX (if not exists)
        await channel.assertExchange(DLX_EXCHANGE, "direct", { durable: true });
        logger.info(`[RabbitMQ] DLX '${DLX_EXCHANGE}' asserted.`);

        // Create a DLQ (if not exists)
        await channel.assertQueue(DLX_QUEUE, { durable: true });
        logger.info(`[RabbitMQ] DLQ '${DLX_QUEUE}' asserted.`);

        // Bind the DLQ to the DLX
        await channel.bindQueue(DLX_QUEUE, DLX_EXCHANGE, DLX_QUEUE);
        logger.info(`[RabbitMQ] DLQ '${DLX_QUEUE}' bound to DLX '${DLX_EXCHANGE}'.`);

        // Create the main queue with DLX configuration
        await channel.assertQueue(QUEUE, {
            durable: true,
            deadLetterExchange: DLX_EXCHANGE,
            deadLetterRoutingKey: DLX_QUEUE,
        });
        logger.info(`[RabbitMQ] Queue '${QUEUE}' asserted with DLX '${DLX_EXCHANGE}'.`);

        // Bind the main queue to the exchange
        await channel.bindQueue(QUEUE, EXCHANGE, "");
        logger.info(`[RabbitMQ] Queue '${QUEUE}' bound to exchange '${EXCHANGE}'.`);

        /* Consume messages from the main queue */
        channel.consume(QUEUE, async (message: Message | null) => {
            if (message !== null) {
                try {
                    const userData: UserData = JSON.parse(message.content.toString());
                    logger.info(`[RabbitMQ] Received user event for userID: ${userData?.userID}`);

                    const success: boolean = await processUserData(userData);

                    if (success) {
                        logger.info(`[RabbitMQ] Successfully processed event for userID: ${userData?.userID}`);
                        channel.ack(message);
                    } else {
                        logger.warn(`[RabbitMQ] Processing failed for userID: ${userData?.userID}. Sending to DLQ.`);
                        channel.nack(message, false, false); // Reject the message (do not requeue)
                    }
                } catch (error) {
                    logger.error(`[RabbitMQ] Error processing user event: `, { error });
                    channel.nack(message, false, false); // Reject the message (do not requeue)
                }
            }
        });

        /* Consume messages from the DLQ for retries */
        channel.consume(DLX_QUEUE, async (message: Message | null) => {
            if (message !== null) {
                const userData: UserData = JSON.parse(message.content.toString());
                const retryCount: number = message.properties.headers?.['x-retry-count'] || 0;

                if (retryCount < MAX_RETRIES) {
                    logger.warn(`[RabbitMQ] Retrying event (${retryCount + 1}/${MAX_RETRIES}) for userID: ${userData?.userID}`);

                    const success: boolean = await processUserData(userData);

                    if (success) {
                        logger.info(`[RabbitMQ] Retry successful for userID: ${userData?.userID}`);
                        channel.ack(message);
                    } else {
                        logger.warn(`[RabbitMQ] Retry failed for userID: ${userData?.userID}. Republishing to DLQ...`);
                        // Increment retry count and republish to DLQ
                        channel.publish(EXCHANGE, "", Buffer.from(JSON.stringify(userData)), {
                            persistent: true,
                            headers: { 'x-retry-count': retryCount + 1 },
                        });
                        channel.ack(message);
                    }
                } else {
                    logger.error(`[RabbitMQ] Max retries reached for userID: ${userData?.userID}. Manual intervention required.`, { userData });
                    channel.ack(message);
                }
            }
        });

        logger.info("[RabbitMQ] Ready to consume messages...");
    } catch (error) {
        logger.error(`[RabbitMQ] Critical error in consumer setup: `, { error });
    }
}

/* Handle the processing of received data here */
async function processUserData(userData: UserData): Promise<boolean> {
    try {
        logger.info(`[RabbitMQ] Processing user data for userID: ${userData?.userID}`);

        if (!userData?.userID) {
            logger.error(`[RabbitMQ] Invalid user data: Missing userID`);
            return false;
        }

        let success: boolean = false;

        if (userData.type === "user") {
            success = await createUser(userData);
        } else if (userData.type === "username") {
            success = await updateUsername(userData.userID, userData.username!);
        } else if (userData.type === "picture") {
            success = await updateProfilePicture(userData.userID, userData.profilePicture!);
        } else {
            logger.warn(`[RabbitMQ] Unknown user event type: ${userData.type}`);
            return false;
        }

        if (success) {
            logger.info(`[RabbitMQ] Successfully processed user event for userID: ${userData?.userID}`);
            return true;
        } else {
            logger.warn(`[RabbitMQ] Failed to process user event for userID: ${userData?.userID}`);
            return false;
        }
    } catch (error) {
        logger.error(`[RabbitMQ] Error processing user event for userID: ${userData?.userID}`, { error });
        return false;
    }
}

/* Create a new user in the database */
async function createUser(user: UserData): Promise<boolean> {
    try {
        if (!user?.userID || !user?.username) {
            logger.error(`[Database] Invalid user data: Missing required fields`);
            return false;
        }

        await User.create({
            userID: user.userID,
            username: user.username,
            profilePic: user.profilePicture ?? undefined,
        });

        logger.info(`[Database] Successfully created user with userID: ${user.userID}`);
        return true;
    } catch (error) {
        console.log(error);
        logger.error(`[Database] Error creating user with userID: ${user?.userID}`, { error });
        return false;
    }
}

/* Update username in the database */
async function updateUsername(userID: string, newUsername: string): Promise<boolean> {
    try {
        if (!userID || !newUsername) {
            logger.error(`[Database] Invalid input: Missing userID or newUsername`);
            return false;
        }

        await User.update(
            { username: newUsername },
            { where: { userID: userID } }
        );

        logger.info(`[Database] Successfully updated username for userID: ${userID}`);
        return true;
    } catch (error) {
        logger.error(`[Database] Error updating username for userID: ${userID}`, { error });
        return false;
    }
}

/* Update profile picture in the database */
async function updateProfilePicture(userID: string, newProfilePicture: string): Promise<boolean> {
    try {
        if (!userID || !newProfilePicture) {
            logger.error(`[Database] Invalid input: Missing userID or newProfilePicture`);
            return false;
        }

        await User.update(
            { profilePic: newProfilePicture },
            { where: { userID: userID } }
        );

        logger.info(`[Database] Successfully updated profile picture for userID: ${userID}`);
        return true;
    } catch (error) {
        logger.error(`[Database] Error updating profile picture for userID: ${userID}`, { error });
        return false;
    }
}

getUserEvents();