import amqp from 'amqplib';
import 'dotenv/config';
import prisma from '../../configs/prisma';

const EXCHANGE = "post_events_exchange";
const QUEUE_NAME = "post_deleted_queue";
const RETRY_QUEUE_NAME = "post_deleted_retry_queue";
const DLX_NAME = "post_deleted_dlx";
const MAX_RETRIES = 5;

async function consumePostDeletedEvent() {
    try {
        // Create a connection to RabbitMQ
        const connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_STRING!);
        const channel = await connection.createChannel();

        // Declare the exchange
        await channel.assertExchange(EXCHANGE, "direct", { durable: true });

        // Declare the retry queue with DLX
        await channel.assertQueue(RETRY_QUEUE_NAME, {
            durable: true,
            deadLetterExchange: DLX_NAME,
            messageTtl: 60000, // Optional: Time to live for messages in the retry queue
        });

        // Declare the DLX queue
        await channel.assertQueue(DLX_NAME, { durable: true });

        // Declare the main queue
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Bind the main queue to the exchange
        await channel.bindQueue(QUEUE_NAME, EXCHANGE, "post.deleted");

        console.log(`Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

        // Consume messages from the main queue
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());
                console.log("Received post deleted event:", messageContent);

                try {
                    // Handle the post deletion logic here
                    await handlePostDeletion(messageContent.postID);
                    // Acknowledge the message
                    channel.ack(msg);
                } catch (error) {
                    console.error(`Error deleting post for post ID: ${messageContent.postID}`, error);
                    const retryCount = msg.properties.headers?.['x-retry-count'] || 0; // Optional chaining

                    if (retryCount < MAX_RETRIES) {
                        // Increment the retry count and requeue the message
                        channel.sendToQueue(RETRY_QUEUE_NAME, msg.content, {
                            headers: {
                                'x-retry-count': retryCount + 1,
                            },
                            persistent: true,
                        });
                    } else {
                        // Send to DLX after max retries
                        channel.sendToQueue(DLX_NAME, msg.content, { persistent: true });
                    }
                    // Acknowledge the message
                    channel.ack(msg);
                }
            }
        }, { noAck: false });

        // Consume messages from the retry queue
        channel.consume(RETRY_QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());
                console.log("Retrying post deletion event:", messageContent);

                try {
                    // Handle the post deletion logic here
                    await handlePostDeletion(messageContent.postID);
                    // Acknowledge the message
                    channel.ack(msg);
                } catch (error) {
                    console.error(`Error retrying post deletion for post ID: ${messageContent.postID}`, error);
                    const retryCount = msg.properties.headers?.['x-retry-count'] || 0; // Optional chaining

                    if (retryCount < MAX_RETRIES) {
                        // Increment the retry count and requeue the message
                        channel.sendToQueue(RETRY_QUEUE_NAME, msg.content, {
                            headers: {
                                'x-retry-count': retryCount + 1,
                            },
                            persistent: true,
                        });
                    } else {
                        // Send to DLX after max retries
                        channel.sendToQueue(DLX_NAME, msg.content, { persistent: true });
                    }
                    // Acknowledge the message
                    channel.ack(msg);
                }
            }
        }, { noAck: false });

    } catch (error) {
        console.error("Error consuming post deleted event:", error);
    }
}

async function handlePostDeletion(postID: string) {
    try {
        await prisma.post.delete({
            where: { postID },
        });

        await prisma.timeline.deleteMany({
            where: { postID },
        });

        console.log(`Post deleted successfully for post ID: ${postID}`);
    } catch (error) {
        console.error(`Error deleting post for post ID: ${postID}`, error);
        throw error; // Re-throw the error to handle it in the consumer
    }
}

// Start consuming
consumePostDeletedEvent();