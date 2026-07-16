import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import Redis from "ioredis";
import helmet from "helmet";
import {RateLimiterRedis} from "rate-limiter-flexible";
import { rateLimit } from 'express-rate-limit';

import proxy from 'express-http-proxy';

import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import limiter from "./middleware/ratelimiter.js";
import validateToken from "./middleware/authMiddleware.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());


app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});

export const redisClient = new Redis(process.env.REDIS_URL);

const redidRateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: 10,
    duration: 1,
    keyPrefix: 'middleware',
});

app.use((req, res, next) => {

    redidRateLimiter.consume(req.ip)
        .then(() => next())
        .catch(err => {
            logger.error(`rateLimit error for if ${req.ip}`)
            res.status(429).json({
                success: false,
                message: "rateLimit exceeded"
            });
        })
})

app.use(limiter(16*60*1000, 100));

const proxyOptions = {
    proxyReqPathResolver:  (req) =>{
        return req.originalUrl.replace(/^\/v1/, "/api");
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`proxy error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: "proxy error",
            error: err.message
        })
    }
}

app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq)=>{
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes)=>{
        logger.info(`Response received form from Identity service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}));

app.use('/v1/post', validateToken ,proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq)=>{
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        proxyReqOpts.headers['x-auth-id'] = srcReq.user.id;
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes)=>{
        logger.info(`Response received form from Post service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}));


app.use('/v1/media', validateToken ,proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq)=>{
        proxyReqOpts.headers['x-auth-id'] = srcReq.user.id;
        if(!srcReq.headers['content-type'].startsWith('multipart/form-data')) {
            proxyReqOpts.headers['Content-Type'] = 'application/json';
        }
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes)=>{
        logger.info(`Response received form from media service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
    parseReqBody: false
}));


app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`Api gateway is running on the port ${PORT}`);
    logger.info(`Identity Services is running on the port ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post Services is running on the port ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media Services is running on the port ${process.env.MEDIA_SERVICE_URL}`);
    console.log(`server listening on port ${PORT}`);
})

