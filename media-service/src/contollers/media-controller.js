import logger from "../utils/logger.js";
import {uploadMediaCloudnary} from "../utils/cloudinary.js";
import Media from "../models/mediaModel.js";

const uploadMedia = async (req, res) => {
    logger.info("Starting uploadMedia ");

    try {
        const uFile = req.file



        if (!uFile) {
            logger.error("No file found");
            return res.status(400).json({
                success: false,
                message: "No file found"
            });
        }



        const {originalname, mimetype, buffer} = uFile;
        const userId = req.user.userId;
        console.log(buffer.length);
        logger.info(`File details : name ${originalname}, mimeType ${mimetype}, buffer: ${buffer.toString()}`);
        logger.info("Upload to Cloudinary staring");

        const cloudinaryUploadResult = await uploadMediaCloudnary(uFile);
        logger.info("Upload to Cloudinary successfully");

        const newlyCreatedMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName: originalname,
            mimetype: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId: userId
        });

        await newlyCreatedMedia.save();

        res.status(200).json({
            success: true,
            message: "Successfully uploaded successfully",
            mediaId: newlyCreatedMedia,
            url: cloudinaryUploadResult.secure_url
        })


    } catch (err) {
        logger.error(`Error in the uploadMedia${err.message}`);
        res.status(500).json({
            success: false,
            message: `Error in uploadMedia ${err.message}`
        })
    }
}

export {uploadMedia};