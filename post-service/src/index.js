
import express from 'express';
import dotenv from "dotenv";

dotenv.config();
import mongoose from "mongoose";
import Redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import { RateLimiterRedis } from "rate-limiter-flexible";

import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import limiter from "./middleware/ratelimiter.js";
import postRoutes from "./routes/post-routes.js";
import authMiddleware from "./middleware/auth-middleware.js";

const PORT = process.env.PORT || 3002;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(helmet());
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

app.use('/api/post', (req, res, next) => {
    req.redisClient = redisClient;
    next();
} ,authMiddleware, postRoutes);

async function connectToDB() {
    await mongoose.connect(process.env.MONDODB_URL)
        .then(() => logger.info('MongoDB Connected'))
        .catch(err => logger.error("mongoDb connection error", err));
}


app.use(errorHandler);
async function startServer() {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });
    await connectToDB();
}

await startServer();


process.on('unhandledRejection', (reason, promise) => {
    logger.error(`unhandled rejection: ${reason}, Promise: ${promise}`);
})
