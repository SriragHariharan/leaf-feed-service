/*
 * Consumer file used to consume events when a new post is added.
 * This event is processed to generate and update user feeds.
 */
import * as amqp from 'amqplib';
import logger from "../../helpers/logger";
import { getRabbitMQConnection, closeRabbitMQConnection } from './rabbitmq.config';
import { Post } from '../../configs/sequelize/models.sequelize';
import sendFanoutEvents from './fanout-events.producer';

const EXCHANGE = "post_events_exchange";
const QUEUE = "post_events_queue";
const DLX_EXCHANGE = "post_events_dlx_exchange";
const DLX_QUEUE = "post_events_dlx_queue";
const MAX_RETRIES = 5;

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

        // Create the main exchange (if not exists)
        await channel.assertExchange(EXCHANGE, "direct", { durable: true });
        logger.info(`[RabbitMQ] Exchange '${EXCHANGE}' asserted.`);

        // Create the DLX (Dead Letter Exchange) (if not exists)
        await channel.assertExchange(DLX_EXCHANGE, "direct", { durable: true });
        logger.info(`[RabbitMQ] DLX '${DLX_EXCHANGE}' asserted.`);

        // Create the DLQ (Dead Letter Queue) (if not exists)
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

        // Bind the main queue to the exchange with the routing key "post.created"
        await channel.bindQueue(QUEUE, EXCHANGE, "post.created");
        logger.info(`[RabbitMQ] Queue '${QUEUE}' bound to exchange '${EXCHANGE}' with routing key 'post.created'.`);

        /* Consume messages from the main queue */
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
                        logger.warn(`[RabbitMQ] Processing failed for postID: ${postData?.postID}. Sending to DLQ.`);
                        channel.nack(message, false, false); // Reject the message (do not requeue)
                    }
                } catch (error) {
                    logger.error(`[RabbitMQ] Error processing post event: `, { error });
                    channel.nack(message, false, false); // Reject the message (do not requeue)
                }
            }
        });

        /* Consume messages from the DLQ for retries */
        channel.consume(DLX_QUEUE, async (message) => {
            if (message !== null) {
                const postData = JSON.parse(message.content.toString());
                const retryCount = message.properties.headers?.['x-retry-count'] || 0;

                if (retryCount < MAX_RETRIES) {
                    logger.warn(`[RabbitMQ] Retrying event (${retryCount + 1}/${MAX_RETRIES}) for postID: ${postData?.postID}`);

                    const success = await processPostData(postData);

                    if (success) {
                        logger.info(`[RabbitMQ] Retry successful for postID: ${postData?.postID}`);
                        channel.ack(message);
                    } else {
                        logger.warn(`[RabbitMQ] Retry failed for postID: ${postData?.postID}. Republishing to DLQ...`);
                        // Increment retry count and republish to DLQ
                        channel.publish(EXCHANGE, "post.created", Buffer.from(JSON.stringify(postData)), {
                            persistent: true,
                            headers: { 'x-retry-count': retryCount + 1 },
                        });
                        channel.ack(message);
                    }
                } else {
                    logger.error(`[RabbitMQ] Max retries reached for postID: ${postData?.postID}. Manual intervention required.`, { postData });
                    channel.ack(message);
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
            // createdAt: postData.createdAt || new Date(),
        });

        /* call the producer and send messages to fanout service */
        sendFanoutEvents(postData.ownerID, postData.postID);

        logger.info(`[RabbitMQ] Successfully processed post event for postID: ${postData.postID}`);
        return true;
    } catch (error) {
        console.log(error)
        logger.error(`[RabbitMQ] Error processing post event for postID: ${postData?.postID}`, { error });
        return false;
    }
}

// Start the consumer
consumePostEvents();