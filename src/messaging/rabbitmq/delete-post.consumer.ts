import amqp from 'amqplib';
import 'dotenv/config';
import prisma from '../../configs/prisma';

const EXCHANGE = "post_events_exchange";
const QUEUE_NAME = "post_deleted_queue";

async function consumePostDeletedEvent() {
    try {
        // Create a connection to RabbitMQ
        const connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_STRING!);
        const channel = await connection.createChannel();

        // Declare the exchange
        await channel.assertExchange(EXCHANGE, "direct", { durable: true });

        // Declare the queue
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Bind the queue to the exchange with the routing key
        await channel.bindQueue(QUEUE_NAME, EXCHANGE, "post.deleted");

        console.log(`Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

        // Consume messages from the queue
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());
                console.log("Received post deleted event:", messageContent);

                try {
                    await handlePostDeletion(messageContent.postID);
                    channel.ack(msg);
                    console.log(`Acknowledged message for post ID: ${messageContent.postID}`);
                } catch (error) {
                    console.error(`Failed to handle post deletion for post ID: ${messageContent.postID}`, error);
                    channel.nack(msg, false, true); // Requeue the message
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

        console.log(`Post and timeline entries deleted successfully for post ID: ${postID}`);
    } catch (error) {
        console.error(`Error deleting post or timeline entries for post ID: ${postID}`, error);
        throw new Error("Failed to delete post or timeline entries");
    }
}

// Start consuming
consumePostDeletedEvent();
