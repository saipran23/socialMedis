
import logger from "../utils/logger.js";
import User from "../models/user.js";
import {validationRegration, validationLogin} from "../utils/validation.js";
import {genrateToken} from "../utils/genrateToken.js";
import user from "../models/user.js";
import RefreshToken from "../models/RefreshToken.js";

const registerUser = async (req, res) => {
    logger.info('registerUser', req.body);
    try{

        const { error, value } = validationRegration(req.body);
        if (error) {
            logger.warn(`validationRegistration error: ${error}`);
            return res.status(400).json({
                success: false,
                message: error,
            });
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
        });

    }catch(err){
        logger.error("registration error occurred", err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const loginUser = async (req, res) => {
    logger.info('LoginUser', req.body);

    try{
        const { error, value } = validationLogin(req.body);
        if (error) {
            logger.warn(`validationLogin error: ${error}`);
            return res.status(400).json({
                success: false,
                message: error,
            });
        }

        const {email, password} = req.body;

        const user = await User.findOne({ email });

        if(!user){
            logger.warn(`Invalid user ${email}`);
            return res.status(400).json({
                success: false,
                message: `Invalid credentials`
            })
        }

        const isValidPassword = await user.comparePassword(password);
        console.log(isValidPassword);
        if(!isValidPassword){
            logger.warn(`Invalid Password ${user.email}`);
            return res.status(400).json({
                success: false,
                message: `Invalid Password`
            })
        }

        const {accessToken, refreshToken} = await genrateToken(user);

        res.status(201).json({
            success: true,
            message: "User Login successfully",
            userId:user._id,
            accessToken: accessToken,
            refreshToken: refreshToken,
        });


    }catch (err){
        logger.error("Login error occurred", err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const refreshTokenUser = async (req, res) => {
    logger.info('RefreshToken', req.body);
    try {

        const { refreshToken } = req.body;
        if(!refreshToken){
            logger.warn(`RefreshToken is required`);
            return res.status(400).json({
                success: false,
                message: "RefreshToken is required",
            })
        }

        const storedToken = await RefreshToken.findOne({token: refreshToken});

        if(!storedToken || storedToken.expiresAt < new Date()){
            logger.warn("Invalid or Expired refresh token")
            return res.status(401).json({
                success: false,
                message: "Invalid or Expired refresh token",
            })
        }

        const user = await User.findById(storedToken.user);
        if(!user){
            logger.warn(`User is not found`);
            res.status(401).json({
                success: false,
                message: "user is not found",
            })
        }

        const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await genrateToken(user);

        await RefreshToken.deleteOne({_id: storedToken._id});
        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        })


    }catch(err){
        logger.error("Refresh Token Error", err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const logoutUser = async (req, res) => {
    logger.info('LogoutUser', req.body);
    try {
        const {refreshToken} = req.body;

        if(!refreshToken){
            logger.warn(`RefreshToken is required`);
            return res.status(400).json({
                success: false,
                message: "RefreshToken is required",
            })
        }

        await RefreshToken.deleteOne({token: storedToken.token});
        logger.info(`RefreshToken  is deleted ${refreshToken}`);

        res.status(200).json({
            success: true,
            message: "User Logout Successfully",
        })

    }catch (err){
        logger.error("Logout Error", err);
        return res.status(500).json({
            success: false,
            message: 'Logout Error',
        });
    }
}


export {registerUser, loginUser, refreshTokenUser, logoutUser};