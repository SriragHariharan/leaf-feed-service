import prisma from "../../configs/prisma";
import logger from "../../helpers/logger";
import amqp, { Channel, Connection, Message } from "amqplib";

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
        const connection: Connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_STRING!);
        logger.info("[RabbitMQ] Connection established successfully.");

        const channel: Channel = await connection.createChannel();
        logger.info("[RabbitMQ] Channel created successfully.");

        await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
        await channel.assertExchange(DLX_EXCHANGE, "direct", { durable: true });
        await channel.assertQueue(DLX_QUEUE, { durable: true });
        await channel.bindQueue(DLX_QUEUE, DLX_EXCHANGE, DLX_QUEUE);
        await channel.assertQueue(QUEUE, {
            durable: true,
            deadLetterExchange: DLX_EXCHANGE,
            deadLetterRoutingKey: DLX_QUEUE,
        });
        await channel.bindQueue(QUEUE, EXCHANGE, "");

        channel.consume(QUEUE, async (message: Message | null) => {
            if (message) {
                try {
                    const userData: UserData = JSON.parse(message.content.toString());
                    const success = await processUserData(userData);
                    success ? channel.ack(message) : channel.nack(message, false, false);
                } catch (error) {
                    logger.error("[RabbitMQ] Error processing user event", { error });
                    channel.nack(message, false, false);
                }
            }
        });

        channel.consume(DLX_QUEUE, async (message: Message | null) => {
            if (message) {
                const userData: UserData = JSON.parse(message.content.toString());
                const retryCount = message.properties.headers?.['x-retry-count'] || 0;

                if (retryCount < MAX_RETRIES) {
                    const success = await processUserData(userData);
                    if (success) {
                        channel.ack(message);
                    } else {
                        channel.publish(EXCHANGE, "", Buffer.from(JSON.stringify(userData)), {
                            persistent: true,
                            headers: { 'x-retry-count': retryCount + 1 },
                        });
                        channel.ack(message);
                    }
                } else {
                    logger.error("[RabbitMQ] Max retries reached", { userData });
                    channel.ack(message);
                }
            }
        });

        logger.info("[RabbitMQ] Ready to consume messages...");
    } catch (error) {
        logger.error("[RabbitMQ] Critical error in consumer setup", { error });
    }
}

async function processUserData(userData: UserData): Promise<boolean> {
    if (!userData.userID) return false;

    switch (userData.type) {
        case "user":
            return await createUser(userData);
        case "username":
            return await updateUsername(userData.userID, userData.username!);
        case "picture":
            return await updateProfilePicture(userData.userID, userData.profilePicture!);
        default:
            logger.warn("Unknown user event type", { type: userData.type });
            return false;
    }
}

async function createUser(user: UserData): Promise<boolean> {
    try {
        if (!user.userID || !user.username) {
            logger.error("Invalid user data: Missing userID or username");
            return false;
        }

        await prisma.user.create({
            data: {
                userID: user.userID,
                username: user.username,
                profilePic: user.profilePicture ?? undefined,
            },
        });

        logger.info(`Successfully created user with userID: ${user.userID}`);
        return true;
    } catch (error) {
        logger.error("Error creating user", { userID: user.userID, error });
        return false;
    }
}

async function updateUsername(userID: string, newUsername: string): Promise<boolean> {
    try {
        if (!userID || !newUsername) {
            logger.error("Invalid input: Missing userID or newUsername");
            return false;
        }

        await prisma.user.update({
            where: { userID: userID },
            data: { username: newUsername },
        });

        logger.info(`Successfully updated username for userID: ${userID}`);
        return true;
    } catch (error) {
        logger.error("Error updating username", { userID, error });
        return false;
    }
}

async function updateProfilePicture(userID: string, newProfilePicture: string): Promise<boolean> {
    try {
        if (!userID || !newProfilePicture) {
            logger.error("Invalid input: Missing userID or newProfilePicture");
            return false;
        }

        await prisma.user.update({
            where: { userID: userID },
            data: { profilePic: newProfilePicture },
        });

        logger.info(`Successfully updated profile picture for userID: ${userID}`);
        return true;
    } catch (error) {
        logger.error("Error updating profile picture", { userID, error });
        return false;
    }
}

getUserEvents();
