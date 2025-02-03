
import * as amqp from 'amqplib';

let connection: amqp.Connection | null = null;

export async function getRabbitMQConnection(): Promise<amqp.Connection> {
    if (!connection) {
        connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_STRING!);
    }
    return connection;
}

export async function closeRabbitMQConnection(): Promise<void> {
    if (connection) {
        await connection.close();
        connection = null;
    }
}