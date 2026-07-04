
import mongoose from 'mongoose';
import argon2 from "argon2";


const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }

},{
    timestamps: true,
});


UserSchema.pre('save', async function (next) {
    if(!this.isModified('password')) {
        try {

            this.password = await argon2.hash(this.password);

        }catch (e){
            return next(e);
        }
    }
})

UserSchema.methods.comparePassword = async function (password) {
    try {

        return await argon2.verify(password, this.password);

    }catch (e){
        throw e;
    }
}


UserSchema.index({username: 'text'});

const User = mongoose.model('User', UserSchema);

export default User;
