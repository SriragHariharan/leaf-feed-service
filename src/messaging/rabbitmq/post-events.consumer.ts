import * as amqp from 'amqplib';
import logger from '../../helpers/logger';
import { getRabbitMQConnection, closeRabbitMQConnection } from './rabbitmq.config';
import { PrismaClient } from '@prisma/client';
import fetchFriendID from '../../helpers/fetchFriends';
import { fanoutService } from '../../helpers/fanout';

const prisma = new PrismaClient();
const EXCHANGE = 'post_events_exchange';
const QUEUE = 'post_events_queue';

async function consumePostEvents() {
  let channel: amqp.Channel;
  try {
    logger.info('[RabbitMQ] Initializing connection to RabbitMQ...');
    const connection = await getRabbitMQConnection();
    logger.info('[RabbitMQ] Connection established successfully.');

    channel = await connection.createChannel();
    logger.info('[RabbitMQ] Channel created successfully.');

    await channel.assertExchange(EXCHANGE, 'direct', { durable: true });
    logger.info(`[RabbitMQ] Exchange '${EXCHANGE}' asserted.`);

    await channel.assertQueue(QUEUE, { durable: true });
    logger.info(`[RabbitMQ] Queue '${QUEUE}' asserted.`);

    await channel.bindQueue(QUEUE, EXCHANGE, 'post.created');
    logger.info(`[RabbitMQ] Queue '${QUEUE}' bound to exchange '${EXCHANGE}' with routing key 'post.created'.`);

    channel.consume(QUEUE, async (message) => {
      if (message !== null) {
        try {
          const postData = JSON.parse(message.content.toString());
          logger.info(`[RabbitMQ] Received post event for postID: ${postData?.postID}`);

          const success = await processPostData(postData);

          if (success) {
            logger.info(`[RabbitMQ] Successfully processed event for postID: ${postData?.postID}`);
            channel.ack(message);
          } else {
            logger.warn(`[RabbitMQ] Processing failed for postID: ${postData?.postID}. Discarding message.`);
            channel.ack(message);
          }
        } catch (error) {
          logger.error(`[RabbitMQ] Error processing post event: `, { error });
          channel.ack(message);
        }
      }
    });

    logger.info('[RabbitMQ] Ready to consume messages...');
  } catch (error) {
    logger.error(`[RabbitMQ] Critical error in consumer setup: `, { error });
    await closeRabbitMQConnection();
  }
}

async function processPostData(postData: any): Promise<boolean> {
  try {
    logger.info(`[RabbitMQ] Processing post data for postID: ${postData?.postID}`);

    if (!postData?.postID || !postData?.content || !postData?.ownerID) {
      logger.error('[RabbitMQ] Invalid post data: Missing required fields');
      return false;
    }

    await prisma.post.create({
      data: {
        postID: postData.postID,
        imageURL: postData.imageURL || null,
        content: postData.content,
        owner: { connect: { userID: postData.ownerID } },
      },
    });

    const friendID = await fetchFriendID(postData.ownerID);
    logger.info('✅✅✅ Fetched the friendIDs from the user service');

    await fanoutService(friendID, postData.postID);
    logger.info('❤️❤️❤️ Fanout event completed');

    return true;
  } catch (error) {
    logger.error(`[RabbitMQ] Error processing post event for postID: ${postData?.postID}`, { error });
    return false;
  }
}

consumePostEvents();