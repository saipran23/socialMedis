import Joi from 'joi';


const validationRegration = (data) => {
    const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    })

    return schema.validate(data);
};

const validationLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    })

    return schema.validate(data);
};

export {validationRegration, validationLogin};

