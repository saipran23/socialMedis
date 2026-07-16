import { rateLimit } from 'express-rate-limit'
import logger from "../utils/logger.js";
import { RedisStore } from 'rate-limit-redis'
import {redisClient} from "../index.js";

const limiter = () => {
    return rateLimit({
        max: 16 * 60 * 1000,
        windowMs: 50,
        message: "Too many requests, please try again later",
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) =>{
            logger.warn("Sensitive endpoint rete limit exceeded for Ip", req.ip);
            res.status(429).json({
                success: false,
                message: `Too many requests, please try again later`,
            })
        },
        store: new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
        }),
    });
};

export default limiter;