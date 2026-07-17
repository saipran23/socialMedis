import {v2 as cloudinary} from 'cloudinary'
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.my_cloud_name,
    api_key: process.env.my_key,
    api_secret: process.env.my_secret
});

const uploadMediaCloudnary = async (file) => {
    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
            },
            (error, result) => {
                if (error) {
                    logger.error(`Error uploading media: ${error}`);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        uploadStream.end(file.buffer);
    });
};

const deleteMediaCloudnary = async (publicId) => {
    logger.info(`deleteMedia Cloud ${publicId} is started.`);
    try{

        const result = await cloudinary.uploader.destroy(publicId);
        logger.info(`Successfully deleting ${publicId}`);

        return result;

    }catch (error) {
        logger.error(`Error deleting media from Cloudinary: ${error}`);
        throw error;
    }

}

export {uploadMediaCloudnary, deleteMediaCloudnary};