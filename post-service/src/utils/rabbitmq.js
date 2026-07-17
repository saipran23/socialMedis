
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


export default connectToRabbitMQ;
