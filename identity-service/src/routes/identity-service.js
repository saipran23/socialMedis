
import express from "express";

const router = express.Router();

import {registerUser, loginUser, logoutUser, refreshTokenUser} from "../controllers/identity-controller.js";


router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/refresh-token", refreshTokenUser);


export default router;