
import amqp from "amqplib";
import logger from "./logger.js";
import dotenv from "dotenv";
dotenv.config();

let connection = null;
let channel = null;

const EXCHANGE_NAME = "asaipr23";


async function connectToRabbitMQ() {

    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'topic', {durable : false});

        logger.info(`connection to rabbit mq`);
        return connection;

    }catch (e) {
        logger.error(`Error connecting rabbit MQ connection failed: ${e.message}`);

    }
}

// async function publishEvent(routingKey, message){
//     if(!channel){
//         await connectToRabbitMQ();
//     }
//
//     channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(message)));
//     logger.info(`Event published: ${routingKey}`);
// }


async function consumeEvent(routingKey, callback){
    if(!channel){
        await connectToRabbitMQ();
    }

    const q = await channel.assertQueue("", {exclusive : true});
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
    channel.consume(q.queue, (message) => {
        if(message != null){
            const content = JSON.parse(message.content.toString());
            callback(content);
            channel.ack(message);
        }
    });

    logger.info(`Subscribed to event : ${routingKey}`);
}


export {connectToRabbitMQ, consumeEvent};
