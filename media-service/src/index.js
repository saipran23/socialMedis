
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import helmet from "helmet";
import mongoose from "mongoose";
import Redis from "ioredis";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";


import errorHandler from "./middleware/errorHandler.js";
import limiter from "./middleware/ratelimiter.js";
import logger from "./utils/logger.js";
import mediaRoutes from "./routes/media-routes.js";
import {connectToRabbitMQ, publishEvent, consumeEvent} from "./utils/rabbitmq.js";
import {handlePostDeleted} from "./eventHandlers/media-event-handlers.js";


const PORT = process.env.PORT || 3003;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.use(limiter());


app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});

export const redisClient = new Redis(process.env.REDIS_URL);

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 10,
    duration: 1
});


app.use((req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => next())
        .catch(err => {
            logger.error(`rateLimit error for if ${req.ip}`)
            res.status(429).json({
                success: false,
                message: "rateLimit exceeded"
            });
        });
});


app.use('/api/media', mediaRoutes);


app.use(errorHandler);
async function connectToDB() {
    await mongoose.connect(process.env.MONDODB_URL)
        .then(() => logger.info('MongoDB Connected'))
        .catch(err => logger.error("mongoDb connection error", err));
}



async function startServer() {
    await connectToDB();
    await connectToRabbitMQ();
    await consumeEvent('post.deleted', handlePostDeleted);
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });

}

await startServer();


process.on('unhandledRejection', (reason, promise) => {
    logger.error(`unhandled rejection: ${reason}, Promise: ${promise}`);
})

