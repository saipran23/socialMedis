import logger from "../utils/logger.js";
import search from "../models/searchModel.js";

const searchPostController = async (req, res) => {
    logger.debug("searchPost endpoint hit");

    try {

        const {query} = req.body;

        if (!query) {
            logger.error(" query required to  found");
            return res.status(401).json({
                success: false,
                message: " query required to  found"
            });
        }

        const result = await search.find({
                $text: {$search: query}
            },
            {
                score: {$meta: 'textScore'}
            }
        ).sort({score: {$meta: 'textScore'}}).limit(10);

        return res.status(200).json({
            success: true,
            results: result
        })

    } catch (e) {
        logger.error(`Error while searching Post : ${e.message}`);
        return res.status(500).send({
            success: false,
            error: `Error while searching Post : ${e.message}`
        })
    }

}


export { searchPostController };