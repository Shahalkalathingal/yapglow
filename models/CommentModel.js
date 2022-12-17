const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        isSelf:{
            type: Boolean,
            required: true,
        },
        date: {
            type: String,
            required: true,
            default: Date.now(),
        },
        text:{
            type:String,
            required:false
        },
        username:{
            type:String,
            required:false
        },
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'user'
        },

        streamkey:{
            type:String,
            required:true,
        },
    },
    { collection: "comments", timestamps: true },
);

const model = mongoose.model("comment", UserSchema);

module.exports = model;