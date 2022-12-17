const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        date: {
            type: String,
            required: true,
            default: Date.now(),
        },
        category: {
            type: String,
            required: false,
        },
        favorites:[{
            type: mongoose.Schema.Types.ObjectId,
            ref:'user'
        }],
        bio:{
            type:String,
            required:false
        },
        loved:[{
            type: mongoose.Schema.Types.ObjectId,
            ref:'user'
        }],

        earnings:{
            type:String,
            required:false,
            default:"0"
        },
        image:{
            type:String,
            required:false,
        },
        streamkey:{
            type:String,
            required:true,
            unique:true,
        }
    },
    { collection: "users", timestamps: true },
);

const model = mongoose.model("user", UserSchema);

module.exports = model;