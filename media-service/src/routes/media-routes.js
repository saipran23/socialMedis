import express from 'express';
import multer from 'multer';
import path from 'path';
import {uploadMedia} from "../contollers/media-controller.js";
import authenticatedRequest from "../middleware/auth-middleware.js"
import logger from "../utils/logger.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
}).single("file");


router.post('/upload', authenticatedRequest,(req, res, next) =>{
        upload(req, res, function (err) {
            if(err instanceof multer.MulterError){
                logger.error(`Multer error while uploading ${err}`);
                return res.status(400).json({
                    success: false,
                    message: `Multer error while uploading ${err.message}`,
                    stack: err.stack
                });
            }else if(err){
                logger.error(`Unknown error while uploading ${err}`);
                return res.status(500).json({
                    success: false,
                    message: `Unknown error while uploading ${err.message}`,
                    stack: err.stack
                });
            }

            if(!req.file){
                logger.error("No file found in multer");
                res.status(400).json({
                    success: false,
                    message: "No file found in multer"
                });
            }
            next();
        })

} ,uploadMedia);

export default router;
