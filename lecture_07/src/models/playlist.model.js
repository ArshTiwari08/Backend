import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name : {
            type : String,
            required : ture
        },
        discription:{
            type : String,
            required : ture
        },
        videos :[
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ],
        owner : {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    },{timestamps : true}
)

export const Playlist = mongoose.model("Playlist",playlistSchema)