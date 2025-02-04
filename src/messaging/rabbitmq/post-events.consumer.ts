/*
 * Simplified Consumer: Processes post events and updates user feeds.
 */
import * as amqp from 'amqplib';
import logger from "../../helpers/logger";
import { getRabbitMQConnection, closeRabbitMQConnection } from './rabbitmq.config';
import { Post } from '../../configs/sequelize/models.sequelize';
import fetchFriendID from '../../helpers/fetchFriends';
import { fanoutService } from '../../helpers/fanout';
// import sendFanoutEvents from './fanout-events.producer';

const EXCHANGE = "post_events_exchange";
const QUEUE = "post_events_queue";

async function consumePostEvents() {
    let channel: amqp.Channel;
    try {
        logger.info("[RabbitMQ] Initializing connection to RabbitMQ...");

        // Establish a TCP connection
        const connection = await getRabbitMQConnection();
        logger.info("[RabbitMQ] Connection established successfully.");

        // Create a channel (communication line)
        channel = await connection.createChannel();
        logger.info("[RabbitMQ] Channel created successfully.");

        // Create the exchange if it does not exist
        await channel.assertExchange(EXCHANGE, "direct", { durable: true });
        logger.info(`[RabbitMQ] Exchange '${EXCHANGE}' asserted.`);

        // Create the main queue
        await channel.assertQueue(QUEUE, { durable: true });
        logger.info(`[RabbitMQ] Queue '${QUEUE}' asserted.`);

        // Bind the queue to the exchange
        await channel.bindQueue(QUEUE, EXCHANGE, "post.created");
        logger.info(`[RabbitMQ] Queue '${QUEUE}' bound to exchange '${EXCHANGE}' with routing key 'post.created'.`);

        // Consume messages from the queue
        channel.consume(QUEUE, async (message) => {
            if (message !== null) {
                try {
                    const postData = JSON.parse(message.content.toString());
                    logger.info(`[RabbitMQ] Received post event for postID: ${postData?.postID}`);

                    // Process the post data
                    const success = await processPostData(postData);

                    if (success) {
                        logger.info(`[RabbitMQ] Successfully processed event for postID: ${postData?.postID}`);
                        channel.ack(message); // Acknowledge the message
                    } else {
                        logger.warn(`[RabbitMQ] Processing failed for postID: ${postData?.postID}. Discarding message.`);
                        channel.ack(message); // Prevent requeueing failed messages
                    }
                } catch (error) {
                    logger.error(`[RabbitMQ] Error processing post event: `, { error });
                    channel.ack(message); // Prevent requeueing messages on failure
                }
            }
        });

        logger.info("[RabbitMQ] Ready to consume messages...");
    } catch (error) {
        logger.error(`[RabbitMQ] Critical error in consumer setup: `, { error });
        await closeRabbitMQConnection();
    }
}

/* Handle the processing of received post data */
async function processPostData(postData: any): Promise<boolean> {
    console.log(postData, " ::: post data");
    try {
        logger.info(`[RabbitMQ] Processing post data for postID: ${postData?.postID}`);

        // Validate required fields
        if (!postData?.postID || !postData?.content || !postData?.ownerID) {
            logger.error(`[RabbitMQ] Invalid post data: Missing required fields`);
            return false;
        }

        // Insert the post data into the database
        await Post.create({
            postID: postData.postID,
            imageURL: postData.imageURL || null,
            content: postData.content,
            ownerID: postData.ownerID,
        });

        /* collect friendID */
        const friendID = await fetchFriendID(postData.ownerID);
        console.log("✅✅✅fetched the friendIDs from the user service");

        /* trigger fanout event */
        console.log("✅✅✅fanout event triggered");
        await fanoutService(friendID, postData.postID);
        console.log("❤️❤️❤️Fanout event completed")

        return true;
    } catch (error) {
        console.log(error);
        logger.error(`[RabbitMQ] Error processing post event for postID: ${postData?.postID}`, { error });
        return false;
    }
}

// Start the consumer
consumePostEvents();
