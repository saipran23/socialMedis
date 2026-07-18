import logger from "../utils/logger.js";
import Media from "../models/mediaModel.js";

import {deleteMediaCloudnary} from "../utils/cloudinary.js";

export const handlePostDeleted = async (event) => {
    console.log(event);

    const {postId, mediaIds} = event;


    try {

        const mediaToDeletes = await Media.find({
            publicId: { $in: mediaIds }
        });

        for(const mediaToDelete of mediaToDeletes) {
            await deleteMediaCloudnary(mediaToDelete.publicId);
            await Media.findByIdAndDelete(mediaToDelete._id);

            logger.info("Media deleted successfully deleted", mediaToDelete);
        }

        logger.info("Processed deleted Completed");

    }catch(err) {
        logger.error("Error occurred while deleting cloudinary", err);
    }

}
