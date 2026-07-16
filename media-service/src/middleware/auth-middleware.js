

import logger from "../utils/logger.js";

const authenticatedRequest =  (req, res, next) => {
    const userId = req.headers['x-auth-id'];
    if(!userId){
        logger.warn(`Access attempted without userId`);
        return res.status(401).send({
            success: false,
            message: "Authenticated required! please login to continue"
        })
    }

    req.user = {userId};
    next();
}

export default authenticatedRequest;