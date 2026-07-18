
import logger from '../utils/logger.js';
import search from "../models/searchModel.js";

async function handlePostCreated(event){
    try{

        const newSearchPost = new search({
            postId : event.postId,
            userId : event.userId,
            content : event.content,
            createdAt: event.createdAt
        });

        await newSearchPost.save();
        logger.info(`search post created ${newSearchPost.postId}, Id; ${newSearchPost._id.toString()}`)

    }catch(err){
        logger.error(`Error handling the post created in search : ${err.message}`);
    }
}

async function handlePostDelete(event){

    try {

        await search.findOneAndDelete({
            postId:event.postId
        })
        logger.info(`search post delete ${event.postId}`)

    }catch(err){
        logger.error(`Error handling the post deleted in search : ${err.message}`);
    }

}

export {handlePostCreated, handlePostDelete};