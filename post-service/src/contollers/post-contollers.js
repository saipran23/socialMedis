import logger from "../utils/logger.js";
import Post from "../models/post.js";
import {validationCreatePost} from "../utils/validation.js";
import {publishEvent} from "../utils/rabbitmq.js";

async function invalidatePostCache(req, cacheKey) {
    // Delete single post cache
    await req.redisClient.del(cacheKey);

    // Delete paginated caches
    const keys = await req.redisClient.keys("posts:*");

    if (keys.length > 0) {
        await req.redisClient.del(...keys);
    }
}

export const createPost = async (req, res) => {
    logger.info("Creating new post...");

    try {

        const {error, value} = validationCreatePost(req.body);
        if (error) {
            logger.warn(`validation CreatePost error: ${error}`);
            return res.status(400).json({
                success: false,
                message: error,
            });
        }

        const {content, mediaIds} = req.body;
        console.log(content)

        const newCreatedPost = new Post({
            user: req.user.userId,
            content: content,
            mediaIds: mediaIds || []
        })

        await newCreatedPost.save();
        await invalidatePostCache(req, newCreatedPost._id.toString());
        logger.info("Post successfully created");
        res.status(201).json({
            success: true,
            message: "Post successfully created"
        });
    } catch (err) {
        logger.error("Error creating new post...");
        res.status(500).send({
            status: false,
            message: `Error creating new post: ${err.message}`,
        })
    }
}

export const getAllPosts = async (req, res) => {
    logger.info("Getting all posts...");

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        const cachePosts = await req.redisClient.get(cacheKey);

        if (cachePosts) {
            return res.json(JSON.parse(cachePosts));
        }

        const posts = await Post.find({}).sort({createdAt: -1}).skip(startIndex).limit(limit);

        const totalNoOfPosts = await Post.countDocuments();

        const result = {
            posts: posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoOfPosts / limit),
            totalPosts: totalNoOfPosts
        }

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        res.json(result);

    } catch (err) {
        logger.error("Error getting a posts...");
        res.status(500).send({
            status: false,
            message: `Error getting a posts: ${err.message}`,
        })


    }

}

export const getPost = async (req, res) => {
    logger.info("Get  post...");
    try {

        const postId = req.params.id;
        const cacheKey = `posts:${postId}`;
        const cachePosts = await req.redisClient.get(cacheKey);

        if (cachePosts) {
            return res.json(JSON.parse(cachePosts));
        }

        const PostDetailsbyId = await Post.findById(postId);

        if (!PostDetailsbyId) {
            return res.status(404).send({
                success: false,
                message: `Post with id ${postId} not found`
            })
        }

        await req.redisClient.setex(cacheKey, 3300, JSON.stringify(PostDetailsbyId));

        res.json(JSON.parse(PostDetailsbyId));

    } catch (err) {
        logger.error("Error getting a post...");
        res.status(500).send({
            status: false,
            message: `Error getting a post By ID: ${err.message}`,
        })


    }
}

export const deletePost = async (req, res) => {
    logger.info("delete  post...");
    try {

        const postId = req.params.id;
        console.log(postId);
        const cacheKey = `posts:${postId}`;


        const deletedPost = await Post.findOneAndDelete({
            _id: postId,
            user: req.user.userId
        });
        console.log(deletedPost);
        if (!deletedPost) {
            logger.warn(`Error deleting post ${postId}`);
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        await publishEvent('post.deleted', {
            postId: deletedPost._id.toString(),
            userId: req.user.userId,
            mediaIds: deletedPost.mediaIds
        })

        await invalidatePostCache(req, cacheKey);
        return res.status(200).json({
            success: true,
            message: "Post deleted successfully",
            data: deletedPost,
        });

    } catch (err) {
        logger.error("Error deleting a post...");
        res.status(500).send({
            status: false,
            message: `Error deleting a post: ${err.message}`,
        })
    }
}