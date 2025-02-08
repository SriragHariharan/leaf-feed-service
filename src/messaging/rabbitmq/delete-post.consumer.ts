import amqp from 'amqplib';
import 'dotenv/config';
import { Post, Timeline } from '../../configs/sequelize/models.sequelize';

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
        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());
                console.log("Received post deleted event:", messageContent);

                // Acknowledge the message
                channel.ack(msg);

                // Handle the post deletion logic here
                handlePostDeletion(messageContent.postID);
            }
        }, { noAck: false });
    } catch (error) {
        console.error("Error consuming post deleted event:", error);
    }
}

async function handlePostDeletion(postID: string) {
    try {
        await Post.destroy({
            where: { postID },
        });

        await Timeline.destroy({
            where: { postID },
        });

        console.log(`Post deleted successfully for post ID: ${postID}`);
    } catch (error) {
        console.error(`Error deleting post for post ID: ${postID}`, error);
    }
}


// Start consuming
consumePostDeletedEvent();