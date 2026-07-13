
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


UserSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await argon2.hash(this.password);
});

UserSchema.methods.comparePassword = async function (password) {
    try {

        return await argon2.verify(this.password, password);

    }catch (e){
        return false;
    }
}


UserSchema.index({username: 'text'});

const User = mongoose.model('User', UserSchema);

export default User;
