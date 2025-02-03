/*
 * This function sends a message to the fanout service via RabbitMQ.
 * The fanout service is responsible for fetching the list of friends/followers
 * of the post owner (ownerID) and distributing the post (postID) to their timelines.
 * 
 * The message is published to a fanout exchange, which broadcasts it to all
 * connected queues, enabling scalable and decoupled distribution of events.
 */

import * as amqp from 'amqplib';
import { closeRabbitMQConnection, getRabbitMQConnection } from './rabbitmq.config';

const EXCHANGE = "fanout_events_exchange";

async function sendFanoutEvents(ownerID: string, postID: string): Promise<void> {
    let connection;
    try {
        // Create a TCP connection
        connection = await getRabbitMQConnection();

        // Create a channel (communication line within tcp connection)
        const channel = await connection.createChannel();

        // Create an exchange if not present
        await channel.assertExchange(EXCHANGE, "direct", { durable: true });

        // Convert userDetails to a buffer
        const bufferMessage = Buffer.from(JSON.stringify({ownerID, postID}));

        // Send message to the exchange(No routing key needed for fanout exchange)
        await channel.publish(EXCHANGE, "post.fanout", bufferMessage);
        console.log("User event sent successfully");

        // Close the channel and connection
        await channel.close();
    } catch (error) {
        console.error("Error sending user event:", error);
        throw error;
    }finally{
        await closeRabbitMQConnection();
    }
}

export default sendFanoutEvents;