import express from "express";

import logger from "../utils/logger.js";
import {searchPostController} from "../contollers/search-controller.js";
import authenticatedRequest from "../middleware/auth-middleware.js";

const router = express.Router();

router.post('/posts', authenticatedRequest, searchPostController)


export default router;
