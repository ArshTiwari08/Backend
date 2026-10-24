import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate  from "mongoose-paginate-v2"

const commentSchema = mongoose.Schema(
    {
        content :{
            type : String,
            required : true
        },
        video :{
            type : Schema.Types.ObjectId,
            ref : "video"
        },
        owner : {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    },{timestamps : true}
)

commentSchema.plugin(mongooseAggregatePaginate)
export const Comment = mongoose.model("Comment",videoSchema)