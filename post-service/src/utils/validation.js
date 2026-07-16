import Joi from 'joi';


const validationCreatePost = (data) => {
    const schema = Joi.object({
        content: Joi.string().required(),
        // mediaIds: Joi.array().items(Joi.string()).required(),
    })

    return schema.validate(data);
};

export {validationCreatePost};

