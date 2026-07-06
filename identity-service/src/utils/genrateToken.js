import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import * as crypto from "node:crypto";

dotenv.config();

import RefreshToken from "../models/RefreshToken.js";

const genrateToken = async (user) => {
    const accessToken = jwt.sign({
        id: user._id,
        username: user.username,
    }, process.env.JWT_SCRECT, {
        expiresIn: "15m",
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt: expiresAt,
    });

    return {accessToken: accessToken, refreshToken: refreshToken};
}

export { genrateToken };