
import logger from "../utils/logger.js";
import User from "../models/user.js";
import {validationRegration} from "../utils/validation.js";
import {genrateToken} from "../utils/genrateToken.js";

const registerUser = async (req, res) => {
    logger.info('registerUser', req.body);
    try{

        const { error, value } = validationRegration(req.body);
        if (error) {
            logger.warn(`validationRegration error: ${error}`);
            return res.status(400).json({
                success: false,
                message: error,
            })
        }

        const {email, password, username } = req.body;

        let user = await User.findOne({ $or: [{username},{ email }] });
        if(user){
            logger.warn(`user is already exist ${user.username}: ${user.email}`);
            return res.status(400).json({
                success: false,
                message: "User already exist",
            });
        }

        user = new User({ username, email, password});
        await user.save();

        logger.warn(`user registered successfully ${user._id} `);

        const {accessToken, refreshToken} = await genrateToken(user);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            accessToken: accessToken,
            refreshToken: refreshToken,
        })

    }catch(err){
        logger.error("registeration error occured", err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        })
    }
}


export {registerUser};