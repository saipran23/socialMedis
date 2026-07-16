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

export {uploadMediaCloudnary};