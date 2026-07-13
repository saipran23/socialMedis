import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from "helmet";
import { RateLimiterRedis  } from "rate-limiter-flexible";
import redis from "ioredis";

import logger from "./utils/logger.js";
import configureCors from "./confiq/corsConfiq.js";
import Redis from "ioredis";
import limiter from "./middleware/ratelimiter.js";
import auth from "./routes/identity-service.js"
import errorHandler from "./middleware/errorHandler.js"

const app = express();
dotenv.config();

// mongoose.connect(process.env.MONDODB_URL)
//     .then(() => logger.info('MongoDB Connected'))
//     .catch(err => logger.error("mongoDb connection error",err));


app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(configureCors());


app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});

app.get('/health', (req, res) => {
    res.status(200).send({
        status: 200,
        message: 'Healthy'
    })
})


async function connectToDB() {
    await mongoose.connect(process.env.MONDODB_URL)
        .then(() => logger.info('MongoDB Connected'))
        .catch(err => logger.error("mongoDb connection error",err));
}

export const redisClient = new Redis(process.env.REDIS_URL);

const reteLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 10,
    duration: 1
});


app.use((req, res, next) => {
    reteLimiter.consume(req.ip)
        .then(()=> next())
        .catch(err => {
            logger.error(`rateLimit error for if ${req.ip}`)
            res.status(429).json({
                success: false,
                message :  "rateLimit exceeded"
            });
        });
});

app.use(errorHandler);


// app.use('/api/auth/register',limiter(16*60*1000, 50));
app.use('/api/auth/login',limiter());
app.use('/api/auth', auth, limiter());

const port = process.env.PORT || 3001;
async function startServer(){
    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
    await connectToDB();
}
await startServer();


process.on('unhandledRejection', (reason, promise) => {
    logger.error(`unhandled rejection: ${reason}, Promise: ${promise}`);
})
