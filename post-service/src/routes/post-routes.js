import express from "express";

import {createPost, getAllPosts, getPost, deletePost} from "../contollers/post-contollers.js";
import authenticatedRequest from "../middleware/auth-middleware.js";
const router = express.Router();

router.use(authenticatedRequest);

router.post("/create-post", createPost);
router.delete("/deletePost/:id", deletePost);
router.get("/getAllPosts", getAllPosts);
router.get("/getPost/:id", getPost);


export default router;