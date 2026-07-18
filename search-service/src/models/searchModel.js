
import mongoose from "mongoose";

const searchPostSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,

    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {timestamps: true});

searchPostSchema.index({content : 'text'});
// searchPostSchema.index({userId : 'text'});
searchPostSchema.index({createdAt : -1});

const search = mongoose.model("search", searchPostSchema);

export default search;