import { createClient,  } from 'redis';

async function createRedisClient(): Promise<any> {
    const client = createClient({
        url: process.env.REDIS_URL
    });

    client.on('error', (err) => {
        console.error('Redis error:', err);
    });

    client.on('connect', () => {
        console.log('Connected to Redis');
    });

    try {
        await client.connect();
        return client;
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        throw err;
    }
}

export default createRedisClient;