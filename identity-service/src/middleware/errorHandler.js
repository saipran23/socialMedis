import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === "production" && !err.status
            ? "Internal Server Error"
            : err.message,
    });
}

export default errorHandler;
