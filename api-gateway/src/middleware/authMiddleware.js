import logger from '../utils/logger.js'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const validateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        logger.warn(`access attempted without  token`);
        res.status(401).json({
            success: false,
            message: 'Missing token',
        })
    }

    jwt.verify(token, process.env.JWT_SCRECT, (err, user) => {
        if (err) {
            logger.warn(`Invalid  token`);
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }

        // console.log(user);
        req.user = user;
        next();
    })
}

export default validateToken;